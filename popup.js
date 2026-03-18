// Popup Script for Bing Rewards Helper

// 当前状态
let currentStatus = null;

// DOM元素（延迟初始化）
let startBtn, stopBtn, resetBtn, saveSettingsBtn;
let statusBadge, statusDot, statusText;
let totalSearchesEl, pcSearchesEl, mobileSearchesEl, pointsEarnedEl;
let enabledCheckbox, enableDailyLimitCheckbox, autoResetDailyCheckbox, notificationEnabledCheckbox;
let maxDailySearchesInput, searchIntervalInput, pcSearchMaxInput, mobileSearchMaxInput;
// 任务状态元素
let signTaskStatus, readTaskStatus, promoTaskStatus, searchTaskStatus;
// 任务配置元素
let enableSignTaskConfig, enableReadTaskConfig, enablePromoTaskConfig, enableSearchTaskConfig;
// OAuth元素
let authStatus, openAuthBtn;
// 自动运行元素
let autoRunEnabled, autoRunResetTime, timeSlot1Start, timeSlot1End, timeSlot2Start, timeSlot2End;

// 初始化DOM元素
function initializeDOMElements() {
    startBtn = document.getElementById('startBtn');
    stopBtn = document.getElementById('stopBtn');
    resetBtn = document.getElementById('resetBtn');
    saveSettingsBtn = document.getElementById('saveSettingsBtn');

    statusBadge = document.getElementById('statusBadge');
    if (statusBadge) {
        statusDot = statusBadge.querySelector('.status-dot');
        statusText = statusBadge.querySelector('.status-text');
    }

    totalSearchesEl = document.getElementById('totalSearches');
    pcSearchesEl = document.getElementById('pcSearches');
    mobileSearchesEl = document.getElementById('mobileSearches');
    pointsEarnedEl = document.getElementById('pointsEarned');

    enabledCheckbox = document.getElementById('enabled');
    enableDailyLimitCheckbox = document.getElementById('enableDailyLimit');
    autoResetDailyCheckbox = document.getElementById('autoResetDaily');
    notificationEnabledCheckbox = document.getElementById('notificationEnabled');

    maxDailySearchesInput = document.getElementById('maxDailySearches');
    searchIntervalInput = document.getElementById('searchInterval');
    pcSearchMaxInput = document.getElementById('pcSearchMax');
    mobileSearchMaxInput = document.getElementById('mobileSearchMax');
    
    // 检查关键元素是否存在
    console.log('🔍 检查DOM元素初始化:');
    console.log('  maxDailySearchesInput:', maxDailySearchesInput ? '✅' : '❌');
    console.log('  searchIntervalInput:', searchIntervalInput ? '✅' : '❌');
    console.log('  pcSearchMaxInput:', pcSearchMaxInput ? '✅' : '❌');
    console.log('  mobileSearchMaxInput:', mobileSearchMaxInput ? '✅' : '❌');
    
    // 任务状态元素
    signTaskStatus = document.getElementById('signTaskStatus');
    readTaskStatus = document.getElementById('readTaskStatus');
    promoTaskStatus = document.getElementById('promoTaskStatus');
    searchTaskStatus = document.getElementById('searchTaskStatus');
    
    // 任务配置元素
    enableSignTaskConfig = document.getElementById('enableSignTaskConfig');
    enableReadTaskConfig = document.getElementById('enableReadTaskConfig');
    enablePromoTaskConfig = document.getElementById('enablePromoTaskConfig');
    enableSearchTaskConfig = document.getElementById('enableSearchTaskConfig');
    
    // OAuth元素
    authStatus = document.getElementById('authStatus');
    openAuthBtn = document.getElementById('openAuthBtn');
    const oauthInfo = document.getElementById('oauthInfo');
    
    // 自动运行元素
    autoRunEnabled = document.getElementById('autoRunEnabled');
    autoRunResetTime = document.getElementById('autoRunResetTime');
    timeSlot1Start = document.getElementById('timeSlot1Start');
    timeSlot1End = document.getElementById('timeSlot1End');
    timeSlot2Start = document.getElementById('timeSlot2Start');
    timeSlot2End = document.getElementById('timeSlot2End');
    
    // 授权警告元素
    const autoAuthBtn = document.getElementById('autoAuthBtn');
    const authExpiredWarning = document.getElementById('authExpiredWarning');
    const fixAuthBtn = document.getElementById('fixAuthBtn');
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeDOMElements();
    loadStatus();
    setupEventListeners();
    startAuthStatusCheck(); // 启动授权状态定期检查
    startStatusUpdate(); // 启动所有状态定期更新
});

// popup 关闭时停止检查
window.addEventListener('beforeunload', () => {
    stopAuthStatusCheck();
    stopStatusUpdate();
});

// 加载状态
function loadStatus() {
    console.log('📊 开始加载状态...');
    chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
        console.log('getStatus响应:', response);
        if (response) {
            currentStatus = response;
            
            if (!currentStatus.config) {
                console.log('⚠️ 配置为空，使用默认值');
                currentStatus.config = {
                    enabled: false,
                    maxDailySearches: 30,
                    searchInterval: 30,
                    pcSearchMax: 30,
                    mobileSearchMax: 20,
                    enableDailyLimit: true,
                    autoResetDaily: true,
                    notificationEnabled: true,
                    searchWordMode: 'dictionary',
                    enableSignTask: true,
                    enableReadTask: true,
                    enablePromoTask: true,
                    enableSearchTask: true,
                    autoRunEnabled: false,
                    autoRunResetTime: '09:00',
                    autoRunTimeSlots: [
                        { start: '10:00', end: '12:00' },
                        { start: '14:00', end: '16:00' }
                    ]
                };
            }
            
            updateUI();
            // 刷新搜索词预览
            refreshWordPreview();
        } else {
            console.error('❌ 获取状态失败，响应为空');
        }
    });
}

// 更新UI
function updateUI() {
    if (!currentStatus) {
        console.log('updateUI: currentStatus为空');
        return;
    }

    console.log('updateUI - isRunning:', currentStatus.isRunning);
    console.log('updateUI - config:', currentStatus.config);

    // 更新状态徽章
    if (currentStatus.isRunning) {
        if (statusBadge) statusBadge.className = 'status running';
        if (statusText) statusText.textContent = '运行中';
        if (startBtn) startBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = false;
    } else {
        if (statusBadge) statusBadge.className = 'status stopped';
        if (statusText) statusText.textContent = '已停止';
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
    }

    // 更新统计信息
    const stats = currentStatus.stats || {};
    totalSearchesEl.textContent = stats.todaySearches || 0;
    pcSearchesEl.textContent = stats.pcSearches || 0;
    mobileSearchesEl.textContent = stats.mobileSearches || 0;
    
    // 估算积分（包括任务积分）
    const points = stats.pointsEarned || (stats.todaySearches || 0) * 5;
    pointsEarnedEl.textContent = points;

    // 更新设置
    const config = currentStatus.config || {};
    console.log('📋 更新配置显示:', {
        enabled: config.enabled,
        maxDailySearches: config.maxDailySearches,
        searchInterval: config.searchInterval,
        pcSearchMax: config.pcSearchMax,
        mobileSearchMax: config.mobileSearchMax
    });
    
    if (enabledCheckbox) enabledCheckbox.checked = config.enabled || false;
    if (enableDailyLimitCheckbox) enableDailyLimitCheckbox.checked = config.enableDailyLimit !== false;
    if (autoResetDailyCheckbox) autoResetDailyCheckbox.checked = config.autoResetDaily !== false;
    if (notificationEnabledCheckbox) notificationEnabledCheckbox.checked = config.notificationEnabled !== false;

    if (maxDailySearchesInput) maxDailySearchesInput.value = config.maxDailySearches || 30;
    if (searchIntervalInput) searchIntervalInput.value = config.searchInterval || 30;
    if (pcSearchMaxInput) pcSearchMaxInput.value = config.pcSearchMax || 30;
    if (mobileSearchMaxInput) mobileSearchMaxInput.value = config.mobileSearchMax || 20;
    
    // 更新搜索词模式
    const searchWordModeEl = document.getElementById('searchWordMode');
    if (searchWordModeEl) searchWordModeEl.value = config.searchWordMode || 'dictionary';
    
    // 更新任务状态
    updateTaskStatus(stats);
    
    // 更新任务配置
    if (enableSignTaskConfig) enableSignTaskConfig.checked = config.enableSignTask === true;
    if (enableReadTaskConfig) enableReadTaskConfig.checked = config.enableReadTask === true;
    if (enablePromoTaskConfig) enablePromoTaskConfig.checked = config.enablePromoTask === true;
    if (enableSearchTaskConfig) enableSearchTaskConfig.checked = config.enableSearchTask === true;
    
    // 更新自动运行配置
    if (autoRunEnabled) autoRunEnabled.checked = config.autoRunEnabled === true;
    if (autoRunResetTime) autoRunResetTime.value = config.autoRunResetTime || '09:00';
    
    // 更新自动运行时间段
    if (config.autoRunTimeSlots && config.autoRunTimeSlots.length >= 2) {
        if (timeSlot1Start) timeSlot1Start.value = config.autoRunTimeSlots[0].start || '10:00';
        if (timeSlot1End) timeSlot1End.value = config.autoRunTimeSlots[0].end || '12:00';
        if (timeSlot2Start) timeSlot2Start.value = config.autoRunTimeSlots[1].start || '14:00';
        if (timeSlot2End) timeSlot2End.value = config.autoRunTimeSlots[1].end || '16:00';
    }
    
    // 检查OAuth状态
    checkOAuthStatus();
}

// 更新任务状态显示
function updateTaskStatus(stats) {
    const taskItems = [
        { element: signTaskStatus, completed: stats.signTaskCompleted },
        { element: readTaskStatus, completed: stats.readTaskCompleted },
        { element: promoTaskStatus, completed: stats.promoTaskCompleted },
        { element: searchTaskStatus, completed: stats.searchTaskCompleted }
    ];
    
    taskItems.forEach(task => {
        if (task.element) {
            if (task.completed) {
                task.element.textContent = '✅ 已完成';
                task.element.className = 'task-status completed';
            } else {
                task.element.textContent = '⏳ 未完成';
                task.element.className = 'task-status pending';
            }
        }
    });
    
    // 检查是否所有任务都已完成
    const allCompleted = taskItems.every(task => task.completed);
    if (allCompleted && stats.todaySearches > 0) {
        console.log('🎉 所有任务都已完成！');
    }
}

// 检查OAuth状态
async function checkOAuthStatus() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'checkTokenStatus' });
        const oauthInfo = document.getElementById('oauthInfo');
        const authExpiredWarning = document.getElementById('authExpiredWarning');
        const fixAuthBtn = document.getElementById('fixAuthBtn');
        
        if (response && authStatus) {
            if (response.hasAccessToken && !response.isExpired) {
                authStatus.textContent = '✅ 已授权';
                authStatus.className = 'status-badge success';
                updateTaskAvailability(true);
                if (oauthInfo) oauthInfo.style.display = 'none';
                if (authExpiredWarning) authExpiredWarning.style.display = 'none';
            } else if (response.hasRefreshToken) {
                authStatus.textContent = '⚠️ Token已过期';
                authStatus.className = 'status-badge warning';
                // 更新任务卡片的可用性
                updateTaskAvailability(false);
                // 显示提示信息
                if (oauthInfo) oauthInfo.style.display = 'block';
                // 显示授权失效警告
                if (authExpiredWarning) authExpiredWarning.style.display = 'block';
                if (fixAuthBtn) fixAuthBtn.textContent = '🔄 刷新Token';
            } else {
                authStatus.textContent = '❌ 未授权';
                authStatus.className = 'status-badge error';
                // 更新任务卡片的可用性
                updateTaskAvailability(false);
                // 显示提示信息
                if (oauthInfo) oauthInfo.style.display = 'block';
                // 显示授权失效警告
                if (authExpiredWarning) authExpiredWarning.style.display = 'block';
                if (fixAuthBtn) fixAuthBtn.textContent = '🔐 完成授权';
            }
        }
    } catch (error) {
        console.error('检查OAuth状态失败:', error);
    }
}

// 定期检查授权状态
let authCheckInterval = null;
let statusUpdateInterval = null;

function startAuthStatusCheck() {
    // 立即检查一次
    checkOAuthStatus();
    
    // 每30秒检查一次授权状态
    if (authCheckInterval) {
        clearInterval(authCheckInterval);
    }
    
    authCheckInterval = setInterval(() => {
        checkOAuthStatus();
    }, 30000);
    
    console.log('🔐 启动授权状态定期检查（每30秒）');
}

// 定期更新所有状态
function startStatusUpdate() {
    // 立即更新一次
    loadStatus();
    
    // 每10秒更新一次所有状态
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
    }
    
    statusUpdateInterval = setInterval(() => {
        loadStatus();
        console.log('📊 更新插件状态');
    }, 10000);
    
    console.log('📊 启动状态定期更新（每10秒）');
}

// 停止授权状态检查
function stopAuthStatusCheck() {
    if (authCheckInterval) {
        clearInterval(authCheckInterval);
        authCheckInterval = null;
        console.log('🔐 停止授权状态定期检查');
    }
}

// 停止状态更新
function stopStatusUpdate() {
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
        statusUpdateInterval = null;
        console.log('📊 停止状态定期更新');
    }
}

// 更新任务可用性
function updateTaskAvailability(hasAuth) {
    const taskCards = ['signTaskCard', 'readTaskCard', 'promoTaskCard'];
    taskCards.forEach(cardId => {
        const card = document.getElementById(cardId);
        if (card) {
            if (!hasAuth) {
                card.style.opacity = '0.5';
                card.title = '需要OAuth授权';
            } else {
                card.style.opacity = '1';
                card.title = '';
            }
        }
    });
}

// 设置事件监听器
function setupEventListeners() {
    console.log('设置事件监听器...');
    console.log('startBtn:', startBtn);
    console.log('stopBtn:', stopBtn);

    if (startBtn) {
        startBtn.addEventListener('click', handleStart);
        console.log('已绑定startBtn点击事件');
    }
    if (stopBtn) {
        stopBtn.addEventListener('click', handleStop);
        console.log('已绑定stopBtn点击事件');
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', handleReset);
    }
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', handleSaveSettings);
    }

    const refreshPreviewBtn = document.getElementById('refreshPreviewBtn');
    if (refreshPreviewBtn) {
        refreshPreviewBtn.addEventListener('click', refreshWordPreview);
    }
    
    // OAuth授权按钮
    if (openAuthBtn) {
        openAuthBtn.addEventListener('click', handleOpenAuth);
    }
    
    // 修复授权按钮
    const fixAuthBtn = document.getElementById('fixAuthBtn');
    if (fixAuthBtn) {
        fixAuthBtn.addEventListener('click', handleFixAuth);
    }
    
    // 监听来自 background 的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'authCompleted') {
            console.log('🎉 收到授权完成通知，更新界面');
            loadStatus();
            showNotification('授权成功', '🎉 OAuth 授权已完成！\n所有任务现已启用');
        } else if (request.action === 'authStatusChanged') {
            console.log('🔐 收到授权状态变化通知，更新界面');
            checkOAuthStatus();
        } else if (request.action === 'statusUpdated') {
            console.log('📊 收到状态更新通知，刷新界面');
            loadStatus();
        }
    });
}

// 打开授权页面
function handleOpenAuth() {
    console.log('🔑 打开授权页面（自动化流程）');
    
    // 直接调用 background.js 的授权流程
    chrome.runtime.sendMessage({ action: 'startAutoAuth' }, (response) => {
        if (response && response.success) {
            showNotification('授权已启动', '🔐 授权页面已打开\n请登录 Microsoft 账户\n授权将自动完成');
        } else {
            console.error('启动授权失败:', response);
            showNotification('授权失败', '❌ 无法启动授权流程');
        }
    });
}

// 修复授权
function handleFixAuth() {
    console.log('🔧 修复授权');
    
    // 检查当前授权状态
    chrome.runtime.sendMessage({ action: 'checkTokenStatus' }, (response) => {
        if (response) {
            if (response.hasRefreshToken && response.isExpired) {
                // 有 Refresh Token，尝试自动刷新
                console.log('🔄 尝试自动刷新 Token');
                showNotification('正在刷新', '🔄 正在自动刷新 Access Token...');
                
                // 等待一段时间让 background 处理刷新
                setTimeout(() => {
                    checkOAuthStatus();
                }, 2000);
            } else {
                // 没有 Refresh Token 或其他问题，启动完整授权流程
                console.log('🔐 启动完整授权流程');
                handleOpenAuth();
            }
        }
    });
}

// 开始搜索
function handleStart() {
    console.log('点击开始搜索按钮');
    
    // 检查OAuth状态
    const enableSignTask = document.getElementById('enableSignTaskConfig');
    const enableReadTask = document.getElementById('enableReadTaskConfig');
    const enablePromoTask = document.getElementById('enablePromoTaskConfig');
    
    const needsAuth = (enableSignTask && enableSignTask.checked) || 
                     (enableReadTask && enableReadTask.checked) || 
                     (enablePromoTask && enablePromoTask.checked);
    
    if (needsAuth) {
        chrome.runtime.sendMessage({ action: 'checkTokenStatus' }, (response) => {
            if (response && (!response.hasAccessToken || response.isExpired)) {
                const confirmed = confirm('⚠️ 检测到需要OAuth授权的任务，但当前未完成授权。\n\n是否继续只执行搜索任务？\n\n如果要完成所有任务，请先点击"打开授权页面"完成授权。');
                if (confirmed) {
                    // 禁用需要OAuth的任务
                    if (enableSignTask) enableSignTask.checked = false;
                    if (enableReadTask) enableReadTask.checked = false;
                    if (enablePromoTask) enablePromoTask.checked = false;
                    handleSaveSettings();
                    startSearchTask();
                }
            } else {
                startSearchTask();
            }
        });
    } else {
        startSearchTask();
    }
}

function startSearchTask() {
    chrome.runtime.sendMessage({ action: 'startSearch' }, (response) => {
        console.log('startSearch响应:', response);
        if (response && response.success) {
            loadStatus();
            showNotification('已启动', '自动搜索任务已开始');
        } else {
            console.error('开始搜索失败，响应:', response);
        }
    });
}

// 停止搜索
function handleStop() {
    console.log('点击停止搜索按钮');
    chrome.runtime.sendMessage({ action: 'stopSearch' }, (response) => {
        console.log('stopSearch响应:', response);
        if (response && response.success) {
            loadStatus();
            showNotification('已停止', '自动搜索任务已停止');
        } else {
            console.error('停止搜索失败，响应:', response);
        }
    });
}

// 重置统计
function handleReset() {
    if (confirm('确定要重置今日的统计信息吗？')) {
        chrome.runtime.sendMessage({ action: 'resetStats' }, (response) => {
            if (response && response.success) {
                loadStatus();
                showNotification('已重置', '统计信息已重置');
            }
        });
    }
}

// 保存设置
function handleSaveSettings() {
    console.log('💾 开始保存设置...');
    
    // 重新获取所有输入框元素，确保存在
    const maxDailySearchesInput = document.getElementById('maxDailySearches');
    const searchIntervalInput = document.getElementById('searchInterval');
    const pcSearchMaxInput = document.getElementById('pcSearchMax');
    const mobileSearchMaxInput = document.getElementById('mobileSearchMax');
    
    if (!maxDailySearchesInput || !searchIntervalInput || !pcSearchMaxInput || !mobileSearchMaxInput) {
        console.error('❌ 找不到必要的输入框元素');
        showNotification('设置错误', '❌ 无法找到配置输入框');
        return;
    }
    
    const searchInterval = parseInt(searchIntervalInput.value) || 30;
    

    const enableSignTaskEl = document.getElementById('enableSignTaskConfig');
    const enableReadTaskEl = document.getElementById('enableReadTaskConfig');
    const enablePromoTaskEl = document.getElementById('enablePromoTaskConfig');
    const enableSearchTaskEl = document.getElementById('enableSearchTaskConfig');
    

    const currentConfig = currentStatus ? (currentStatus.config || {}) : {};
    
    const config = {
        enabled: enabledCheckbox ? enabledCheckbox.checked : false,
        enableDailyLimit: enableDailyLimitCheckbox ? enableDailyLimitCheckbox.checked : true,
        autoResetDaily: autoResetDailyCheckbox ? autoResetDailyCheckbox.checked : true,
        notificationEnabled: notificationEnabledCheckbox ? notificationEnabledCheckbox.checked : true,
        maxDailySearches: parseInt(maxDailySearchesInput.value) || 30,
        searchInterval: searchInterval,
        minSearchInterval: Math.max(10, Math.floor(searchInterval * 0.5)), // 最小间隔为搜索间隔的50%
        maxSearchInterval: Math.floor(searchInterval * 1.5), // 最大间隔为搜索间隔的150%
        pcSearchMax: parseInt(pcSearchMaxInput.value) || 30,
        mobileSearchMax: parseInt(mobileSearchMaxInput.value) || 20,
        searchWordMode: document.getElementById('searchWordMode').value || 'dictionary',
        // 任务配置
        enableSignTask: enableSignTaskEl ? enableSignTaskEl.checked : (currentConfig.enableSignTask !== undefined ? currentConfig.enableSignTask : true),
        enableReadTask: enableReadTaskEl ? enableReadTaskEl.checked : (currentConfig.enableReadTask !== undefined ? currentConfig.enableReadTask : true),
        enablePromoTask: enablePromoTaskEl ? enablePromoTaskEl.checked : (currentConfig.enablePromoTask !== undefined ? currentConfig.enablePromoTask : true),
        enableSearchTask: enableSearchTaskEl ? enableSearchTaskEl.checked : (currentConfig.enableSearchTask !== undefined ? currentConfig.enableSearchTask : true),
        // 自动运行配置
        autoRunEnabled: autoRunEnabled ? autoRunEnabled.checked : false,
        autoRunResetTime: autoRunResetTime ? autoRunResetTime.value : '09:00',
        autoRunTimeSlots: [
            {
                start: timeSlot1Start ? timeSlot1Start.value : '10:00',
                end: timeSlot1End ? timeSlot1End.value : '12:00'
            },
            {
                start: timeSlot2Start ? timeSlot2Start.value : '14:00',
                end: timeSlot2End ? timeSlot2End.value : '16:00'
            }
        ],
        // 保留 OAuth 授权信息
        accessToken: currentConfig.accessToken || null,
        refreshToken: currentConfig.refreshToken || null,
        tokenExpiry: currentConfig.tokenExpiry || null,
        lastResetDate: currentConfig.lastResetDate || null
    };

    console.log('📋 准备保存的配置:', {
        maxDailySearches: config.maxDailySearches,
        searchInterval: config.searchInterval,
        pcSearchMax: config.pcSearchMax,
        mobileSearchMax: config.mobileSearchMax
    });

    // 验证设置
    if (config.maxDailySearches < 1 || config.maxDailySearches > 100) {
        showNotification('设置错误', '每日最大搜索次数必须在1-100之间');
        return;
    }

    if (config.searchInterval < 10 || config.searchInterval > 300) {
        showNotification('设置错误', '任务间隔必须在10-300秒之间');
        return;
    }

    chrome.runtime.sendMessage({ action: 'updateConfig', config: config }, (response) => {
        if (response && response.success) {
            console.log('✅ 配置保存成功');
            showNotification('已保存', '设置已保存');
            
            // 延迟一点再重新加载状态，确保 background 已经保存完成
            setTimeout(() => {
                loadStatus();
            }, 300);
        } else {
            console.error('❌ 配置保存失败:', response);
            showNotification('保存失败', '❌ 配置保存失败');
        }
    });
}

// 显示通知
function showNotification(title, message) {
    // 在popup中显示简单的提示
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    notification.innerHTML = `<strong>${title}</strong><br>${message}`;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 2000);
}

// 刷新搜索词预览
function refreshWordPreview() {
    chrome.runtime.sendMessage({ action: 'getWordPreview' }, (response) => {
        if (response && response.words) {
            const previewWordsEl = document.getElementById('previewWords');
            const colors = ['#667eea', '#764ba2', '#11998e', '#38ef7d', '#ff6b6b', '#4ecdc4'];
            previewWordsEl.innerHTML = response.words.map((word, index) => {
                const color = colors[index % colors.length];
                return `<span style="background: ${color}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px;">${word}</span>`;
            }).join('');
        }
    });
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);