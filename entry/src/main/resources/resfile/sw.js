// 定义缓存版本常量，便于后续版本管理
const CACHE_VERSION = "v1";

self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      try {
        const requestUrl = new URL(event.request.url);
        // 根路径请求触发缓存刷新检查（添加await确保执行完成）
        if (requestUrl.pathname === "/") {
          await maybeFlushCache();
        }

        // 优化：仅缓存同源GET请求，过滤无效请求（POST、跨域等）
        if (event.request.method === "GET" && requestUrl.origin === self.origin) {
          let cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            // 解决问题3：克隆缓存响应，避免流耗尽（先转为blob再创建新响应）
            const blob = await cachedResponse.blob();
            const headers = new Headers(cachedResponse.headers);

            // 添加COOP/COEP安全头，优化判断逻辑
            const requiredHeaders = {
              "Cross-Origin-Embedder-Policy": "require-corp",
              "Cross-Origin-Opener-Policy": "same-origin"
            };
            Object.entries(requiredHeaders).forEach(([key, value]) => {
              if (headers.get(key) !== value) {
                headers.set(key, value); // 用set替代append，避免重复添加
              }
            });

            return new Response(blob, {
              status: cachedResponse.status,
              statusText: cachedResponse.statusText,
              headers: headers,
            });
          }
        }

        // 缓存未命中/非缓存请求，发起网络请求
        const networkResponse = await fetch(event.request);
        return networkResponse;
      } catch (e) {
        console.error("Fetch error occurred:", e);
        // 优化：离线兜底响应，提升用户体验
        return new Response("Service Worker: Network error or resource unavailable", {
          status: 500,
          statusText: "Service Unavailable",
        });
      }
    })(),
  );
});

async function installCache() {
  try {
    const cache = await caches.open(CACHE_VERSION);
    const bootResponse = await fetch("_framework/blazor.boot.json");
    
    // 增加响应校验，避免无效JSON解析
    if (!bootResponse.ok) {
      throw new Error(`Failed to fetch blazor.boot.json: ${bootResponse.status}`);
    }
    
    const bootjson = await bootResponse.json();
    const resources = [
      "/",
      "/MILESTONE",
      "/_framework/blazor.boot.json",
      "/app.ico",
      "/backdrop.png",
      "/AndyBold.ttf",
      "/assets/index.js",
      "/assets/index.css",
      ...Object.keys(bootjson.resources.fingerprinting).map(
        (r) => "_framework/" + r,
      ),
    ];

    // 批量缓存资源，捕获缓存失败异常
    await cache.addAll(resources);
    console.log("Cache installed successfully: all resources cached");
    return cache;
  } catch (e) {
    console.error("Failed to install cache:", e);
    throw e; // 抛出异常，让waitUntil感知到安装失败
  }
}

self.addEventListener("install", (event) => {
  // 解决问题4：将日志放入waitUntil中，等待缓存安装完成后打印
  event.waitUntil(
    installCache().catch((e) => console.error("Install event failed:", e))
  );
  // 跳过等待阶段，直接进入activate（开发/生产均可优化）
  self.skipWaiting();
});

async function maybeFlushCache() {
  try {
    // 解决问题5：增加网络请求错误处理，容错性提升
    const networkMilestoneResponse = await fetch("/MILESTONE", {
      cache: "no-cache", // 强制从网络获取最新版本
      credentials: "same-origin"
    });

    if (!networkMilestoneResponse.ok) {
      console.warn("Failed to fetch latest MILESTONE, skip cache flush");
      return;
    }

    const latestMilestone = await networkMilestoneResponse.text();
    const cachedMilestoneResponse = await caches.match("/MILESTONE");

    // 缓存中存在MILESTONE且内容一致，无需刷新缓存
    if (cachedMilestoneResponse) {
      const cachedMilestone = await cachedMilestoneResponse.text();
      if (cachedMilestone === latestMilestone) {
        console.log("Cache is up to date, no flush needed");
        return;
      }
    }

    // 解决问题1：添加await，等待缓存删除操作完成
    console.log("Cache expired, flushing all caches");
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map((name) => caches.delete(name))
    );

    // 解决问题6：缓存清理后，立即重新安装新缓存
    console.log("Reinstalling new cache after flush");
    await installCache();

  } catch (e) {
    console.error("Failed to check/flush cache:", e);
  }
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 解决问题2：激活后立即接管所有客户端页面
      await self.clients.claim();
      // 执行缓存检查与清理
      await maybeFlushCache();
      console.log("Service Worker activated and ready to handle requests");
    })()
  );
});