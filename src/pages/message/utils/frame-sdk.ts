/**
 * iframe-comm-sdk-final-stable.ts
 *
 * ✅ 支持主 ↔ iframe、iframe ↔ iframe 通信
 * ✅ 域名校验 + sessionKey 握手
 * ✅ 异步 handler (async/await)
 * ✅ sendResponse 异步场景安全触发（setTimeout 包装）
 * ✅ 回调超时保护
 * ✅ iframe 列表广播与动态发现
 */

export interface SDKOptions {
  id: string;
  domain: string;
}

interface MessageBase {
  messageId: string;
  sourceId: string;
  targetId: string;
  relayId?: string;
  type: 'request' | 'response' | 'system';
  encryptedPayload?: string;
  sessionKey?: string;
}

interface RequestPayload {
  action: string;
  data: any;
}

type MessageHandler = (
  payload: RequestPayload,
  sendResponse: (res: any) => void,
  rawMsg: MessageBase
) => void | Promise<void>;

// ============== 加密函数（占位） ==================
function encrypt(data: any): string {
  return btoa(JSON.stringify(data));
}
function decrypt(data: string): any {
  return JSON.parse(atob(data));
}

// ============== 域名白名单（示例） ==================
// const STATIC_WHITELIST = new Set([
//   'https://main.example.com',
//   'https://partnerA.example.com',
//   'https://partnerB.example.com',
// ]);

const STATIC_WHITELIST = new Set([
  'http://localhost:5173',
])

async function validateDomainRemotely(domain: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 30));
  return STATIC_WHITELIST.has(domain);
}

// ==================================================
export interface IframeInfo {
  id: string;
  domain: string;
  window: Window;
  isConnected: boolean;
  lastSeen: number;
}

export class IframeCommSDK {
  private id: string;
  private domain: string;
  private isMain: boolean;
  private sessionKey?: string;
  private trustedKeys = new Set<string>();
  private allowedDomains = new Set<string>();
  private iframeRegistry = new Map<string, IframeInfo>();
  private availableTargets = new Set<string>();
  private handlers: MessageHandler[] = [];
  private pending = new Map<string, (data: any) => void>();
  private tempRelayHandlers = new Map<string, (data: any) => void>();

  constructor(opt: SDKOptions) {
    this.id = opt.id;
    this.domain = opt.domain;
    this.isMain = window === window.parent;

    this.registerDomain(this.domain);
    window.addEventListener('message', this.handleMessage.bind(this));

    if (this.isMain) {
      this.sessionKey = crypto.randomUUID();
      console.log(`[SDK] Main sessionKey generated: ${this.sessionKey}`);
    } else {
      this.sendHandshake();
    }
  }

  // 注册域名
  private async registerDomain(domain: string) {
    if (STATIC_WHITELIST.has(domain) || (await validateDomainRemotely(domain))) {
      this.allowedDomains.add(domain);
    } else {
      console.warn(`[SDK] Domain not allowed: ${domain}`);
    }
  }

  // iframe -> main 握手
  private sendHandshake() {
    if (this.isMain) return;
    const msg = {
      type: 'handshake',
      sourceId: this.id,
      domain: this.domain,
    };
    window.parent.postMessage(msg, '*');
  }

  // main 注册 iframe
  registerIframe(targetId: string, iframe: HTMLIFrameElement) {
    if (!this.isMain) return;
    this.iframeRegistry.set(targetId, {
      id: targetId,
      domain: iframe.src,
      window: iframe.contentWindow!,
      isConnected: false,
      lastSeen: Date.now(),
    });
  }

  // 添加监听
  onMessage(handler: MessageHandler) {
    this.handlers.push(handler);
  }

  // 获取当前可通信的目标列表（iframe端）
  getAvailableTargets() {
    return Array.from(this.availableTargets);
  }

  // main 获取所有已注册 iframe 状态
  getConnectedIframes() {
    return Array.from(this.iframeRegistry.values());
  }

  // 发送消息（带回调 + 超时保护）
  send(targetId: string, payload: RequestPayload, callback?: (res: any) => void, timeout = 5000) {
    if (!this.isMain && !this.availableTargets.has(targetId)) {
      console.warn(`[SDK] Target ${targetId} 不在可通信列表中`);
      return;
    }

    const encryptedPayload = encrypt(payload);
    const msg: MessageBase = {
      messageId: crypto.randomUUID(),
      sourceId: this.id,
      targetId,
      type: 'request',
      encryptedPayload,
      sessionKey: this.sessionKey,
    };

    if (callback) {
      this.pending.set(msg.messageId, callback);
      setTimeout(() => {
        if (this.pending.has(msg.messageId)) {
          console.warn(`[SDK] Message ${msg.messageId} response timeout`);
          this.pending.delete(msg.messageId);
        }
      }, timeout);
    }

    this.post(targetId, msg);
  }

  // 统一发送逻辑
  private post(targetId: string, msg: MessageBase) {
    if (this.isMain) {
      const iframe = this.iframeRegistry.get(targetId);
      iframe?.window.postMessage(msg, '*');
    } else {
      window.parent.postMessage(msg, '*');
    }
  }

  // 主消息处理逻辑（支持 async handler）
  private async handleMessage(event: MessageEvent) {
    const data = event.data;
    const origin = event.origin;

    // 域名过滤
    if (!this.allowedDomains.has(origin) && !STATIC_WHITELIST.has(origin)) {
      console.warn(`[SDK] Blocked origin: ${origin}`);
      return;
    }

    // ===== handshake =====
    if (this.isMain && data?.type === 'handshake') {
      const id = data.sourceId;
      const win = event.source as Window;

      this.iframeRegistry.set(id, {
        id,
        domain: origin,
        window: win,
        isConnected: true,
        lastSeen: Date.now(),
      });

      // 回复 handshake_ack
      const ack = { type: 'handshake_ack', targetId: id, key: this.sessionKey };
      win.postMessage(ack, origin);
      console.log(`[SDK] Handshake success for ${id}`);

      this.broadcastIframeList();
      return;
    }

    // iframe 收到 main 的 ack
    if (!this.isMain && data?.type === 'handshake_ack' && data.key) {
      this.sessionKey = data.key;
      this.trustedKeys.add(data.key);
      console.log('[SDK] Handshake success, sessionKey received');
      return;
    }

    // iframe 收到 iframe_list_update
    if (!this.isMain && data?.type === 'iframe_list_update') {
      const { list } = decrypt(data.encryptedPayload);
      this.availableTargets = new Set(list.filter((x: string) => x !== this.id));
      console.log('[SDK] 可通信 iframe 列表更新:', this.getAvailableTargets());
      return;
    }

    // sessionKey 校验
    if (data?.sessionKey && !this.isMain && !this.trustedKeys.has(data.sessionKey)) {
      console.warn('[SDK] Rejected invalid sessionKey');
      return;
    }

    // ===== response =====
    if (data?.type === 'response') {
      const cb = this.pending.get(data.messageId);
      if (cb) {
        this.pending.delete(data.messageId);
        cb(decrypt(data.encryptedPayload!));
        return;
      }
      
      // 检查是否是转发的响应
      if (this.isMain && this.tempRelayHandlers.has(data.messageId)) {
        const handler = this.tempRelayHandlers.get(data.messageId);
        if (handler) {
          const response = decrypt(data.encryptedPayload!);
          handler(response);
          this.tempRelayHandlers.delete(data.messageId);
        }
        return;
      }
    }

    // ===== request =====
    if (data?.type === 'request') {
      const msg = data as MessageBase;
      const payload = decrypt(msg.encryptedPayload!);

      // ✅ 异步安全版 sendResponse
      const sendResponse = (res: any) => {
        const resp: MessageBase = {
          messageId: msg.messageId,
          sourceId: this.id,
          targetId: msg.sourceId,
          relayId: this.isMain ? undefined : this.id,
          type: 'response',
          encryptedPayload: encrypt(res),
          sessionKey: this.sessionKey,
        };
        // 👇 关键改动：异步上下文安全发送
        setTimeout(() => this.post(msg.sourceId, resp), 0);
      };

      // main 转发 iframe 间通信
      if (this.isMain && msg.targetId && msg.targetId !== this.id) {
        this.relayMessage(msg);
        return;
      }

      // 支持 async handler
      for (const handler of this.handlers) {
        try {
          const maybePromise = handler(payload, sendResponse, msg);
          if (maybePromise && typeof maybePromise.then === 'function') {
            await maybePromise;
          }
        } catch (err) {
          console.error('[SDK] Handler error:', err);
        }
      }
    }
  }

  // main 广播 iframe 列表
  private broadcastIframeList() {
    if (!this.isMain) return;
    const list = Array.from(this.iframeRegistry.values())
      .filter((x) => x.isConnected)
      .map((x) => x.id);
    const msg = {
      type: 'iframe_list_update',
      sourceId: this.id,
      targetId: '*',
      relayId: this.id,
      typeSystem: 'system',
      encryptedPayload: encrypt({ list }),
    };
    for (const i of this.iframeRegistry.values()) {
      i.window.postMessage(msg, '*');
    }
  }

  // main 转发 iframe 间消息
  private relayMessage(msg: MessageBase) {
    if (!this.isMain) return;
    
    // 为转发的消息创建响应处理
    const relayedSendResponse = (res: any) => {
      const resp: MessageBase = {
        messageId: msg.messageId,
        sourceId: this.id,
        targetId: msg.sourceId,
        relayId: this.id,
        type: 'response',
        encryptedPayload: encrypt(res),
        sessionKey: this.sessionKey,
      };
      // 将响应转发回原始发送者
      setTimeout(() => this.post(msg.sourceId, resp), 0);
    };
    
    // 注册转发消息的响应处理
    this.tempRelayHandlers.set(msg.messageId, relayedSendResponse);
    
    const relayMsg = { ...msg, relayId: this.id };
    const target = this.iframeRegistry.get(msg.targetId);
    target?.window.postMessage(relayMsg, '*');
  }

}