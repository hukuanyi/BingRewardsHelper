// OAuth2.0 配置
const OAUTH_CONFIG = {
    clientId: '0000000040170455',
    scope: 'service::prod.rewardsplatform.microsoft.com::MBI_SSL',
    authUrl: 'https://login.live.com/oauth20_authorize.srf',
    redirectUri: 'https://login.live.com/oauth20_desktop.srf'
};

// DOM 元素
const accessTokenStatus = document.getElementById('accessTokenStatus');
const refreshTokenStatus = document.getElementById('refreshTokenStatus');
const tokenExpiryStatus = document.getElementById('tokenExpiryStatus');
const authorizeBtn = document.getElementById('authorizeBtn');
const clearAuthBtn = document.getElementById('clearAuthBtn');
const loading = document.getElementById('loading');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    checkTokenStatus();
    setupEventListeners();
});

// 设置事件监听
function setupEventListeners() {
    authorizeBtn.addEventListener('click', handleAuthorize);
    clearAuthBtn.addEventListener('click', handleClearAuth);
}

// 检查Token状态
async function checkTokenStatus() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'checkTokenStatus' });
        updateStatusUI(response);
    } catch (error) {
        console.error('检查Token状态失败:', error);
        showError('检查Token状态失败');
    }
}

// 更新状态UI
function updateStatusUI(status) {
    // Access Token状态
    if (status.hasAccessToken) {
        accessTokenStatus.textContent = '✅ 已获取';
        accessTokenStatus.className = 'status-value success';
    } else {
        accessTokenStatus.textContent = '❌ 未获取';
        accessTokenStatus.className = 'status-value error';
    }
    
    // Refresh Token状态
    if (status.hasRefreshToken) {
        refreshTokenStatus.textContent = '✅ 已获取';
        refreshTokenStatus.className = 'status-value success';
    } else {
        refreshTokenStatus.textContent = '❌ 未获取';
        refreshTokenStatus.className = 'status-value error';
    }
    
    // Token过期状态
    if (status.hasAccessToken) {
        if (status.isExpired) {
            tokenExpiryStatus.textContent = '⚠️ 已过期';
            tokenExpiryStatus.className = 'status-value warning';
        } else {
            tokenExpiryStatus.textContent = '✅ 有效';
            tokenExpiryStatus.className = 'status-value success';
        }
    } else {
        tokenExpiryStatus.textContent = '⚠️ 无效';
        tokenExpiryStatus.className = 'status-value warning';
    }
}

// 处理授权
async function handleAuthorize() {
    try {
        showLoading(true);
        
        // 生成授权URL
        const authUrl = `${OAUTH_CONFIG.authUrl}?client_id=${OAUTH_CONFIG.clientId}&scope=${encodeURIComponent(OAUTH_CONFIG.scope)}&response_type=code&redirect_uri=${encodeURIComponent(OAUTH_CONFIG.redirectUri)}`;
        
        // 打开授权页面
        chrome.tabs.create({ url: authUrl }, (tab) => {
            console.log('已打开授权页面:', tab.id);
            
            // 监听授权页面的关闭
            const checkInterval = setInterval(() => {
                chrome.tabs.get(tab.id, (tabInfo) => {
                    if (chrome.runtime.lastError) {
                        // 标签页已关闭
                        clearInterval(checkInterval);
                        showLoading(false);
                        alert('请复制授权链接中的 code 参数，然后重新打开此页面手动输入授权码。\n\n授权链接格式：\nhttps://login.live.com/oauth20_desktop.srf?code=M.C540_BAY.2.U.xxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx&lc=1033');
                        return;
                    }
                    
                    // 检查URL是否包含授权码
                    if (tabInfo.url && tabInfo.url.includes('code=')) {
                        clearInterval(checkInterval);
                        chrome.tabs.remove(tab.id);
                        
                        // 提取授权码，处理可能包含特殊字符的情况
                        try {
                            const urlObj = new URL(tabInfo.url);
                            const code = urlObj.searchParams.get('code');
                            if (code) {
                                console.log('✅ 成功提取授权码，长度:', code.length);
                                saveAuthCode(code);
                            } else {
                                showLoading(false);
                                alert('无法从URL中提取授权码');
                            }
                        } catch (error) {
                            showLoading(false);
                            console.error('授权码提取失败:', error);
                            alert('授权码提取失败：' + error.message);
                        }
                    }
                });
            }, 1000);
        });
        
    } catch (error) {
        console.error('授权失败:', error);
        showLoading(false);
        alert('授权失败：' + error.message);
    }
}

// 保存授权码
async function saveAuthCode(authCode) {
    try {
        console.log('保存授权码:', authCode);
        
        const response = await chrome.runtime.sendMessage({ 
            action: 'saveAuthCode',
            authCode: authCode
        });
        
        if (response && response.success) {
            showLoading(false);
            alert('授权成功！Token已保存');
            checkTokenStatus();
        } else {
            showLoading(false);
            alert('授权失败：' + (response?.error || '未知错误'));
        }
    } catch (error) {
        console.error('保存授权码失败:', error);
        showLoading(false);
        alert('保存授权码失败：' + error.message);
    }
}

// 清除授权
async function handleClearAuth() {
    if (!confirm('确定要清除授权吗？清除后需要重新授权才能完成签入、阅读、活动任务。')) {
        return;
    }
    
    try {
        const response = await chrome.runtime.sendMessage({ action: 'clearAuth' });
        
        if (response && response.success) {
            alert('授权已清除');
            checkTokenStatus();
        } else {
            alert('清除授权失败');
        }
    } catch (error) {
        console.error('清除授权失败:', error);
        alert('清除授权失败：' + error.message);
    }
}

// 显示加载状态
function showLoading(show) {
    if (show) {
        loading.classList.add('active');
        authorizeBtn.disabled = true;
        clearAuthBtn.disabled = true;
    } else {
        loading.classList.remove('active');
        authorizeBtn.disabled = false;
        clearAuthBtn.disabled = false;
    }
}

// 显示错误
function showError(message) {
    alert(message);
}