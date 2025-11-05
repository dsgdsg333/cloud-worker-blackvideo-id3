export async function adspect(request, SID,) {
        try {

            // URL RPC + query
            const url = new URL(request.url);
            const rpcUrl = `https://rpc.adspect.net/v2/${SID}${url.search}`;

            // 1) Собираем data как в PHP (data + cid при POST)
            let data = {};
            if (request.method.toUpperCase() === "POST") {
                const ct = request.headers.get("content-type") || "";
                let raw = null;

                if (ct.includes("application/json")) {
                    const body = await request.json().catch(() => ({}));
                    raw = body?.data ?? body ?? null;
                } else if (
                    ct.includes("application/x-www-form-urlencoded") ||
                    ct.includes("multipart/form-data")
                ) {
                    const form = await request.formData().catch(() => null);
                    raw = form?.get("data") ?? null;
                }

                if (raw == null) {
                    return new Response("Missing POST data", { status: 500 });
                }
                try {
                    data = typeof raw === "string" ? JSON.parse(raw) : raw;
                } catch {
                    return new Response("Invalid POST data", { status: 500 });
                }

                // cookie _cid → data.cid
                const cookie = request.headers.get("cookie") || "";
                const m = cookie.match(/(?:^|;\s*)_cid=([^;]+)/);
                if (m) data.cid = decodeURIComponent(m[1]);
            }

            // 2) Псевдо-$_SERVER
            const server = {
                REQUEST_METHOD: request.method,
                QUERY_STRING: url.search.startsWith("?") ? url.search.slice(1) : "",
                REQUEST_URI: url.pathname + url.search,
            };

            const ip =
                request.headers.get("CF-Connecting-IP") ||
                request.headers.get("True-Client-IP") ||
                request.headers.get("X-Forwarded-For")?.split(",").pop()?.trim() ||
                request.headers.get("X-Real-IP") ||
                "0.0.0.0";

            const ua = request.headers.get("User-Agent") || "";
            const host = request.headers.get("Host") || "";

            server.REMOTE_ADDR = ip;
            server.HTTP_USER_AGENT = ua;
            server.HTTP_HOST = host;
            server.SERVER_NAME = host; // приблизительно, как чаще делают на edge

            // все заголовки → HTTP_*
            for (const [k, v] of request.headers) {
                const up = k.toUpperCase().replace(/-/g, "_");
                if (up === "CONTENT_TYPE") server.CONTENT_TYPE = v;
                else if (up === "CONTENT_LENGTH") server.CONTENT_LENGTH = v;
                else server[`HTTP_${up}`] = v;
            }
            // дублируем CF IP явно (часто ожидают)
            const cfip = request.headers.get("CF-Connecting-IP");
            if (cfip) server.HTTP_CF_CONNECTING_IP = cfip;

            // можно приложить гео-инфу отдельно
            if (request.cf) server.CF = request.cf;

            // ВАЖНО: положить server в data
            data.server = server;

            // 3) RPC-заголовки
            const rpcHeaders = {
                "Content-Type": "application/json",
                "Adspect-IP": ip,
                "Adspect-UA": ua,
                // В Workers обычно можно ставить User-Agent, но если вдруг ругается — убери.
                "User-Agent": ua,
            };

            // 4) Вызов и проверки
            const rpcResponse = await fetch(rpcUrl, {
                method: "POST",
                headers: rpcHeaders,
                body: JSON.stringify(data),
            });

            if (!rpcResponse.ok) {
                return new Response(`RPC error ${rpcResponse.status}`, { status: 500 });
            }

            return await rpcResponse.json();


        } catch (err) {
            return new Response(`Internal Error: ${err}`, { status: 500 });
        }
}

