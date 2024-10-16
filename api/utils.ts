// WWWAuthenticate 接口, 主要用于描述 HTTP 401 Unauthorized 响应中的 WWW-Authenticate 头部信息
interface WWWAuthenticate {
    realm: string
    service: string
}

// parseWWWAuthenticate 函数，用于解析 WWW-Authenticate 头部信息
function parseWWWAuthenticate(header: string) {
    const regex = /(?<==")(?:\\.|[^"\\])*(?=")/g
    const matches = header.match(regex)

    // 判断 matches 是否为空或长度小于 2，若为空或长度小于 2，则抛出错误
    if (matches === null || matches.length < 2) {
        throw new Error(`Invalid WWW-Authenticate header: ${header}`)
    }

    // 返回 WWWAuthenticate 对象
    return {
        realm: matches[0],
        service: matches[1]
    } as WWWAuthenticate
}

// 异步 fetchToken 函数，用于获取 token, 传入 WWWAuthenticate 对象和 URLSearchParams 对象
async function fetchToken(wwwAuthenticate: WWWAuthenticate, searchParams: URLSearchParams) {
    // 构造 realm URL 对象
    const url = new URL(wwwAuthenticate.realm)

    // 如果 service 存在，则向 URLSearchParams 对象中添加 service 参数
    if (wwwAuthenticate.service.length) {
        url.searchParams.set('service', wwwAuthenticate.service)
    }

    const scope = searchParams.get('scope')
    if (scope) {
        url.searchParams.set('scope', scope)
    }

    return await fetch(url, {
        method: 'GET',
        headers: {}
    })
}

export { parseWWWAuthenticate, fetchToken }