const url = process.env.URL || ''

// 路由映射表
const routes: { [key: string]: string } = {
    [`docker.${url}`]: "https://registry-1.docker.io",
    [`quay.${url}`]: "https://quay.io",
    [`gcr.${url}`]: "https://gcr.io",
    [`k8s-gcr.${url}`]: "https://k8s.gcr.io",
    [`k8s.${url}`]: "https://registry.k8s.io",
    [`ghcr.${url}`]: "https://ghcr.io",
    [`cloudsmith.${url}`]: "https://docker.cloudsmith.io",
}

// 这个函数主要是通过传入 host 来获取对应的路由
function routeByHosts(host: string) {
    if (host in routes) {
        return routes[host]
    }
    return ""
}

export { routes, routeByHosts }