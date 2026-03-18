
console.log('🔐 OAuth Auto Consent Content Script 已加载');

let checkInterval = null;
let consentButtonFound = false;

function checkAndClickConsentButton() {
    const consentSelectors = [
        'input[type="submit"][value="Accept"]',
        'button[type="submit"]:contains("同意")',
        'button[type="submit"]:contains("Accept")',
        'input[type="submit"][value="Yes"]',
        'button[id="idSIButton9"]',  // Microsoft 特定选择器
        'button[type="submit"]',
        '#acceptButton',
        '.accept-button'
    ];

    for (const selector of consentSelectors) {
        try {
            let button;
            if (selector.includes(':contains')) {
                // 处理 :contains 伪选择器
                const text = selector.match(/:contains\("(.+)"\)/)[1];
                const buttons = document.querySelectorAll('button[type="submit"], input[type="submit"]');
                for (const btn of buttons) {
                    if (btn.textContent && btn.textContent.includes(text)) {
                        button = btn;
                        break;
                    }
                }
            } else {
                button = document.querySelector(selector);
            }

            if (button && !button.disabled && button.offsetParent !== null) {
                console.log('✅ 找到同意按钮:', selector, button);
                console.log('🖱️ 准备自动点击...');

                // 添加点击前的延迟，模拟用户操作
                setTimeout(() => {
                    console.log('🖱️ 自动点击同意按钮');
                    button.click();
                    consentButtonFound = true;
                    clearInterval(checkInterval);
                }, 1000);

                return true;
            }
        } catch (error) {
            console.error('❌ 检查选择器失败:', selector, error);
        }
    }

    return false;
}

// 页面加载完成后开始检查
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM 已加载，开始检查同意按钮');
        startChecking();
    });
} else {
    console.log('📄 页面已加载，立即开始检查同意按钮');
    startChecking();
}

function startChecking() {
    // 立即检查一次
    if (checkAndClickConsentButton()) {
        return;
    }

    // 每秒检查一次，最多检查 30 秒
    let attempts = 0;
    const maxAttempts = 30;

    checkInterval = setInterval(() => {
        attempts++;
        console.log(`🔍 检查同意按钮 (${attempts}/${maxAttempts})...`);

        if (checkAndClickConsentButton()) {
            console.log('✅ 同意按钮已点击');
            return;
        }

        if (attempts >= maxAttempts) {
            console.log('⏰ 检查超时，停止检查');
            clearInterval(checkInterval);

            // 检查是否已经在授权成功页面（可能不需要点击按钮）
            if (window.location.href.includes('oauth20_desktop.srf') && 
                window.location.href.includes('code=')) {
                console.log('✅ 检测到授权成功，已包含 code 参数');
            } else {
                console.log('⚠️ 未找到同意按钮，可能需要手动操作');
                // 显示提示信息
                showManualClickHint();
            }
        }
    }, 1000);
}

// 显示手动点击提示
function showManualClickHint() {
    const hint = document.createElement('div');
    hint.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        animation: slideIn 0.3s ease;
        max-width: 400px;
        text-align: center;
    `;
    hint.innerHTML = `
        <strong>🔐 Bing Rewards Helper</strong><br>
        请点击"同意"或"Accept"按钮完成授权<br>
        <small>页面将在授权成功后自动关闭</small>
    `;

    document.body.appendChild(hint);

    // 5秒后自动消失
    setTimeout(() => {
        hint.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (hint.parentNode) {
                hint.parentNode.removeChild(hint);
            }
        }, 300);
    }, 5000);
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
        }
        to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        to {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 监听 URL 变化，检测授权成功
let lastUrl = location.href;
new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        console.log('🔄 URL 变化:', currentUrl);

        if (currentUrl.includes('code=')) {
            console.log('✅ 检测到授权成功，URL 包含 code 参数');
            clearInterval(checkInterval);

            // 移除提示信息
            const hints = document.querySelectorAll('[style*="Bing Rewards Helper"]');
            hints.forEach(h => {
                if (h.parentNode) {
                    h.parentNode.removeChild(h);
                }
            });
        }
    }
}).observe(document, { subtree: true, childList: true });

console.log('🔐 OAuth Auto Consent 已准备就绪');