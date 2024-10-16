import { Hono } from 'hono'
import { env } from 'hono/adapter'
import { handle } from 'hono/vercel'
import { appendTrailingSlash } from "hono/dist/types/middleware/trailing-slash"
import { parseWWWAuthenticate, fetchToken } from "./utils"
import { routeByHosts, routes } from "./routes"

export const config = { runtime: 'edge' }

interface variables {
  url: URL
  upstream: string
  debug: boolean
}

// 定义中间件
function middleware(env: any, routeByHosts: any, routes: any) {
  return async (c: any, next: any) => {
    const { DEBUG, UPSTREAM } = env(c);
    const url = new URL(c.req.url);

    if (DEBUG && UPSTREAM) {
      c.set("debug", true);
      c.set("url", url);
      c.set("upstream", UPSTREAM as string);
    } else {
      const hostname = url.hostname;
      const upstream = routeByHosts(hostname);

      if (upstream === "") {
        return new Response(
            JSON.stringify({
              routes: routes,
              message: `No route found for hostname "${hostname}"`,
            }),
            {
              status: 404,
            }
        );
      }

      c.set("debug", false);
      c.set("url", url);
      c.set("upstream", upstream);
    }

    await next();
  };
}

// 定义 / 路由
async function handleRootRoute(c: any) {
  const newUrl = new URL(c.get("upstream") + "/v2/");
  const resp = await fetch(newUrl.toString(), {
    method: "GET",
    redirect: "follow",
  });

  if (resp.status === 200) {
    return resp;
  } else if (resp.status === 401) {
    const headers = new Headers();
    const realm = `${c.get("url").origin}/v2/auth`;
    headers.set(
        "Www-Authenticate",
        `Bearer realm="${realm}",service="vercel-docker-proxy"`
    );
    return new Response(JSON.stringify({ message: "UNAUTHORIZED" }), {
      status: 401,
      headers: headers,
    });
  } else {
    return resp;
  }
}

// 定义 /auth 路由
async function handleAuthRoute(c: any) {
  const newUrl = new URL(c.get("upstream") + "/v2/");
  const resp = await fetch(newUrl.toString(), {
    method: "GET",
    redirect: "follow",
  });

  if (resp.status !== 401) {
    return resp;
  }

  const authenticateStr = resp.headers.get("WWW-Authenticate");

  if (authenticateStr === null) {
    return resp;
  }

  const wwwAuthenticate = parseWWWAuthenticate(authenticateStr);
  return await fetchToken(wwwAuthenticate, c.get("url").searchParams);
}

// 定义其他路由
async function handleOtherRoute(c: any) {
  const newUrl = new URL(c.get("upstream") + c.get("url").pathname);
  let headers = new Headers();

  const authHeader = c.req.raw.headers.get("Authorization");
  if (authHeader) {
    headers.set("Authorization", authHeader);
  }

  const acceptHeader = c.req.raw.headers.get("Accept");
  if (acceptHeader) {
    headers.set("Accept", acceptHeader);
  }

  const contentTypeHeader = c.req.raw.headers.get("Content-Type");
  if (contentTypeHeader) {
    headers.set("Content-Type", contentTypeHeader);
  }

  const newReq = new Request(newUrl, {
    method: c.req.method,
    headers: headers,
    redirect: "follow",
  });

  const resp = await fetch(newReq);

  if (c.req.method === "HEAD") {
    resp.headers.set("Content-Type", "application/vnd.oci.image.index.v1+json");
  }

  return resp;
}

// 定义 404 错误路由
async function handleNotFoundRoute(c: any) {
  return new Response("Page Not Found", { status: 404 });
}

// 创建一个 app 实例，并设置 basePath 为 "/v2"
const app = new Hono<{Variables: variables}>({ strict: true }).basePath("/v2")

// 自动添加尾部斜线
app.use(appendTrailingSlash())

// 注册中间件
app.use(middleware(env, routeByHosts, routes))

app.all("/", handleRootRoute)

app.all("/auth", handleAuthRoute)

app.all("*", handleOtherRoute)

// 处理 404 错误
app.notFound(handleNotFoundRoute)

export default handle(app)
