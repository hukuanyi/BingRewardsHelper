// Bing Rewards Helper - Background Script
// 自动完成Bing搜索任务以获取Microsoft Rewards积分

// Edge浏览器User-Agent
const USER_AGENTS = {
    // 桌面端Edge User-Agent
    desktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
    // 移动端Edge User-Agent
    mobile: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 EdgiOS/122.0.0.0 Mobile/15E148 Safari/604.1"
};

// 默认配置
const DEFAULT_CONFIG = {
    enabled: false,
    maxDailySearches: 30,        // 每日最大搜索次数
    searchInterval: 30,          // 搜索间隔（秒）
    minSearchInterval: 15,       // 最小间隔（秒）
    maxSearchInterval: 45,       // 最大间隔（秒）
    pcSearchMax: 30,             // 电脑搜索最大次数
    mobileSearchMax: 20,         // 移动搜索最大次数
    enableDailyLimit: true,      // 是否启用每日限制
    autoResetDaily: true,        // 是否自动每日重置
    notificationEnabled: true,   // 是否启用通知
    searchWordMode: 'dictionary', // 搜索词模式：'dictionary'(词典模式) 或 'random'(随机模式)
    lastResetDate: null,
    // 任务配置
    enableSignTask: true,        // 启用签入任务
    enableReadTask: true,        // 启用阅读任务
    enablePromoTask: true,       // 启用活动任务
    enableSearchTask: true,      // 启用搜索任务
    // 自动运行配置
    autoRunEnabled: false,       // 是否启用自动运行
    autoRunTimeSlots: [          // 自动运行时间段
        { start: '10:00', end: '12:00' },   // 上午10点~12点
        { start: '14:00', end: '16:00' }    // 下午14点~16点
    ],
    autoRunResetTime: '09:00',   // 每日重置时间（早上9点）
    // OAuth配置
    refreshToken: null,          // OAuth Refresh Token
    accessToken: null,           // OAuth Access Token
    tokenExpiry: null            // Token过期时间
};

// 当前状态
let currentStats = {
    todaySearches: 0,
    pcSearches: 0,
    mobileSearches: 0,
    pointsEarned: 0,
    lastSearchTime: null,
    // 任务状态
    signTaskCompleted: false,
    readTaskCompleted: false,
    promoTaskCompleted: false,
    searchTaskCompleted: false
};

// 搜索词典
const SEARCH_DICTIONARY = {
    technology: [
        "人工智能", "机器学习", "深度学习", "神经网络", "数据科学",
        "云计算", "大数据", "区块链", "物联网", "5G技术",
        "Python编程", "JavaScript", "前端开发", "后端开发", "全栈开发",
        "算法", "数据结构", "软件工程", "网络安全", "操作系统",
        "数据库", "分布式系统", "微服务", "容器化", "DevOps",
        "Git版本控制", "代码重构", "设计模式", "敏捷开发", "持续集成",
        "API设计", "RESTful", "GraphQL", "WebSocket", "HTTP协议"
    ],
    life: [
        "健康饮食", "运动健身", "睡眠质量", "心理健康", "时间管理",
        "理财投资", "股票基金", "房产投资", "保险知识", "税务规划",
        "烹饪技巧", "家常菜谱", "营养搭配", "食品安全", "餐厅推荐",
        "装修设计", "家具选购", "家居收纳", "清洁技巧", "智能家居",
        "旅游攻略", "景点推荐", "酒店预订", "交通出行", "签证办理",
        "购物指南", "比价网站", "促销活动", "品牌评测", "售后服务"
    ],
    entertainment: [
        "电影推荐", "电视剧", "综艺节目", "动漫番剧", "纪录片",
        "音乐推荐", "演唱会", "音乐节", "乐器学习", "歌词创作",
        "游戏攻略", "游戏评测", "电竞比赛", "游戏开发", "独立游戏",
        "小说推荐", "文学作品", "诗歌鉴赏", "写作技巧", "出版流程",
        "摄影技巧", "相机推荐", "后期处理", "视频剪辑", "直播技巧",
        "明星八卦", "娱乐新闻", "网红达人", "短视频", "直播带货"
    ],
    education: [
        "学习方法", "记忆技巧", "阅读理解", "写作技巧", "口语表达",
        "英语学习", "日语学习", "韩语学习", "德语学习", "法语学习",
        "数学辅导", "物理公式", "化学实验", "生物知识", "地理知识",
        "历史知识", "政治理论", "哲学思考", "逻辑思维", "批判性思维",
        "考研资料", "公务员考试", "教师资格证", "职业资格证", "技能证书",
        "在线课程", "慕课平台", "学习网站", "教育APP", "培训课程"
    ],
    health: [
        "健身计划", "减肥方法", "增肌训练", "瑜伽教程", "跑步技巧",
        "营养学", "维生素", "蛋白质", "膳食纤维", "健康食品",
        "疾病预防", "症状自查", "用药指南", "医院推荐", "医生预约",
        "心理咨询", "压力管理", "焦虑缓解", "抑郁治疗", "睡眠障碍",
        "中医养生", "穴位按摩", "食疗方法", "养生茶饮", "四季养生",
        "体检项目", "健康指标", "亚健康", "免疫力", "抗衰老"
    ],
    news: [
        "今日头条", "国际新闻", "国内新闻", "科技新闻", "财经新闻",
        "体育新闻", "娱乐新闻", "汽车新闻", "房产新闻", "教育新闻",
        "天气预报", "自然灾害", "环境保护", "气候变化", "可持续发展",
        "政策解读", "法律法规", "社会保障", "就业政策", "民生热点",
        "经济形势", "市场动态", "行业趋势", "创业指南", "企业管理",
        "科技创新", "科研成果", "学术动态", "人才招聘", "职业发展"
    ],
    shopping: [
        "商品对比", "价格查询", "用户评价", "品牌介绍", "产品评测",
        "促销活动", "优惠券", "返利网站", "海淘攻略", "跨境购物",
        "服装搭配", "时尚潮流", "美妆护肤", "香水推荐", "护肤品评测",
        "数码产品", "手机推荐", "电脑配置", "智能家居", "数码配件",
        "家用电器", "厨房电器", "清洁电器", "生活电器", "个人护理",
        "母婴用品", "宠物用品", "办公用品", "运动装备", "户外用品"
    ]
};

// 中文常用字用于生成搜索词
const CHINESE_CHARS = [
    "乙", "一", "乃", "丁", "卜", "刀", "九", "了", "七", "八", "厂", "儿", "二", "几", "力", "人", "入", "十", "又", "久",
    "丸", "丈", "乞", "乡", "勺", "刃", "亏", "凡", "卫", "亿", "亡", "叉", "川", "寸", "弓", "巾", "女", "尸", "士", "夕",
    "么", "万", "三", "上", "下", "与", "习", "也", "之", "义", "于", "个", "千", "及", "大", "飞", "干", "工", "广", "己",
    "已", "口", "马", "门", "山", "才", "土", "小", "子", "丰", "乏", "乌", "丹", "予", "丑", "勾", "勿", "匀", "厅", "允",
    "互", "井", "云", "匹", "凤", "冈", "劝", "凶", "仓", "介", "仇", "仅", "仆", "仁", "仍", "升", "午", "订", "双", "友",
    "艺", "屯", "夫", "巨", "币", "尺", "扎", "巴", "忆", "幻", "尤", "孔", "贝", "父", "户", "斤", "木", "牛", "欠", "犬",
    "氏", "瓦", "牙", "止", "爪", "中", "书", "无", "不", "专", "为", "公", "六", "历", "切", "元", "五", "区", "队", "内",
    "办", "从", "今", "以", "化", "什", "计", "认", "反", "太", "天", "引", "开", "少", "比", "长", "车", "斗", "方", "风",
    "火", "见", "毛", "片", "气", "日", "手", "水", "王", "文", "心", "月", "支", "分", "卡", "册", "乎", "乐", "丘", "丙",
    "丛", "丝", "匆", "占", "厉", "刊", "兄", "兰", "印", "功", "击", "令", "付", "仙", "仪", "仔", "仗", "让", "讨", "讯",
    "训", "辽", "失", "央", "巧", "左", "归", "帅", "叨", "叼", "叮", "句", "古", "另", "叶", "司", "台", "叹", "右", "召",
    "闪", "宁", "奶", "奴", "犯", "尼", "饥", "扒", "扑", "扔", "汉", "汇", "汁", "纠", "圣", "幼", "冬", "孕", "轧", "灭",
    "斥", "末", "未", "旦", "旧", "礼", "永", "甘", "瓜", "禾", "矛", "母", "鸟", "皮", "甲", "申", "田", "穴", "甩", "玉"
];

// OAuth 配置
const OAUTH_CONFIG = {
    clientId: '0000000040170455',
    scope: 'service::prod.rewardsplatform.microsoft.com::MBI_SSL',
    authUrl: 'https://login.live.com/oauth20_authorize.srf',
    tokenUrl: 'https://login.live.com/oauth20_token.srf',
    redirectUri: 'https://login.live.com/oauth20_desktop.srf'
};

// Token管理
async function getAccessToken() {
    const config = await chrome.storage.local.get('config');
    const cfg = config.config || DEFAULT_CONFIG;
    
    // 检查Token是否存在
    if (!cfg.accessToken) {
        console.log('⚠️ Access Token不存在');
        if (!cfg.refreshToken) {
            console.log('⚠️ Refresh Token也不存在，需要重新授权');
        } else {
            console.log('🔄 尝试使用Refresh Token获取新的Access Token');
        }
    }
    
    // 检查Token是否有效
    if (cfg.accessToken && cfg.tokenExpiry) {
        const isExpired = Date.now() >= cfg.tokenExpiry;
        const timeUntilExpiry = cfg.tokenExpiry - Date.now();
        
        if (!isExpired) {
            console.log(`✅ Access Token有效，剩余时间: ${Math.floor(timeUntilExpiry / 1000 / 60)} 分钟`);
            return cfg.accessToken;
        } else {
            console.log(`⚠️ Access Token已过期，过期时间: ${new Date(cfg.tokenExpiry).toLocaleString()}`);
        }
    }
    
    // Token不存在或已过期，尝试刷新
    if (cfg.refreshToken) {
        console.log('🔄 使用Refresh Token刷新Access Token...');
        const newToken = await refreshAccessToken(cfg.refreshToken);
        if (newToken) {
            return newToken;
        } else {
            console.log('❌ Refresh Token刷新失败，可能需要重新授权');
        }
    }
    
    console.log('❌ 无法获取有效的Access Token，请先完成OAuth授权');
    return null;
}

async function refreshAccessToken(refreshToken) {
    try {
        console.log('🔄 刷新Access Token...');
        
        // 构建请求参数
        const params = new URLSearchParams();
        params.append('client_id', OAUTH_CONFIG.clientId);
        params.append('refresh_token', refreshToken);
        params.append('grant_type', 'refresh_token');
        
        const response = await fetch(OAUTH_CONFIG.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });
        
        const data = await response.json();
        
        if (data.access_token && data.refresh_token) {
            const tokenExpiry = Date.now() + (data.expires_in * 1000) - (5 * 60 * 1000); // 提前5分钟过期
            
            const config = await chrome.storage.local.get('config');
            const cfg = config.config || DEFAULT_CONFIG;
            
            cfg.accessToken = data.access_token;
            cfg.refreshToken = data.refresh_token;
            cfg.tokenExpiry = tokenExpiry;
            
            await chrome.storage.local.set({ config: cfg });
            console.log('✅ Token刷新成功');
            return data.access_token;
        } else {
            console.error('❌ Token刷新响应无效:', data);
        }
    } catch (error) {
        console.error('❌ Token刷新失败:', error);
    }
    
    return null;
}

async function saveAuthCode(authCode) {
    try {
        console.log('💾 保存Authorization Code...');
        console.log('🔑 授权码:', authCode);
        
        // 构建请求参数
        const params = new URLSearchParams();
        params.append('client_id', OAUTH_CONFIG.clientId);
        params.append('code', authCode);
        params.append('redirect_uri', OAUTH_CONFIG.redirectUri);
        params.append('grant_type', 'authorization_code');
        
        console.log('🌐 请求URL:', OAUTH_CONFIG.tokenUrl);
        console.log('📋 请求参数:', params.toString());
        
        const response = await fetch(OAUTH_CONFIG.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });
        
        console.log('📊 响应状态码:', response.status, response.statusText);
        
        // 尝试解析JSON
        let data;
        try {
            data = await response.json();
            console.log('📄 响应数据:', data);
        } catch (jsonError) {
            // 如果不是JSON，获取文本
            const textData = await response.text();
            console.error('❌ 响应不是有效的JSON:', textData);
            console.error('❌ JSON解析错误:', jsonError);
            return false;
        }
        
        if (data.access_token && data.refresh_token) {
            const tokenExpiry = Date.now() + (data.expires_in * 1000) - (5 * 60 * 1000);
            
            const config = await chrome.storage.local.get('config');
            // 如果 config.config 不存在，才使用 DEFAULT_CONFIG
            const cfg = config.config ? { ...config.config } : { ...DEFAULT_CONFIG };
            
            // 只更新 token 相关字段，保留其他配置不变
            cfg.accessToken = data.access_token;
            cfg.refreshToken = data.refresh_token;
            cfg.tokenExpiry = tokenExpiry;
            
            await chrome.storage.local.set({ config: cfg });
            console.log('✅ Authorization Code保存成功，Token已获取');
            console.log('⏰ Token过期时间:', new Date(tokenExpiry).toLocaleString());
            console.log('💾 当前配置:', {
                enableSignTask: cfg.enableSignTask,
                enableReadTask: cfg.enableReadTask,
                enablePromoTask: cfg.enablePromoTask
            });
            return true;
        } else {
            console.error('❌ Token响应无效，缺少必要字段:', data);
            console.error('❌ 响应中的字段:', Object.keys(data));
            if (data.error) {
                console.error('❌ OAuth错误:', data.error, data.error_description);
            }
        }
    } catch (error) {
        console.error('❌ Authorization Code保存失败:', error);
        console.error('❌ 错误堆栈:', error.stack);
    }
    
    return false;
}

// 检查Token状态
async function checkTokenStatus() {
    const config = await chrome.storage.local.get('config');
    const cfg = config.config || DEFAULT_CONFIG;
    
    return {
        hasAccessToken: !!cfg.accessToken,
        hasRefreshToken: !!cfg.refreshToken,
        isExpired: cfg.tokenExpiry ? Date.now() >= cfg.tokenExpiry : true
    };
}

// 清除授权
async function clearAuth() {
    try {
        console.log('🗑️ 清除授权信息...');
        
        const config = await chrome.storage.local.get('config');
        const cfg = config.config || DEFAULT_CONFIG;
        
        cfg.accessToken = null;
        cfg.refreshToken = null;
        cfg.tokenExpiry = null;
        
        await chrome.storage.local.set({ config: cfg });
        
        console.log('✅ 授权信息已清除');
        sendNotification('授权已清除', '您的授权信息已被清除，需要重新授权才能完成任务');
        return true;
    } catch (error) {
        console.error('❌ 清除授权失败:', error);
        return false;
    }
}

// 初始化插件
chrome.runtime.onInstalled.addListener(async () => {
    console.log('Bing Rewards Helper 已安装');
    await initializeStorage();
    setupDailyReset();
});

// 初始化存储
async function initializeStorage() {
    const config = await chrome.storage.local.get('config');
    if (!config.config) {
        await chrome.storage.local.set({ config: DEFAULT_CONFIG });
    }
    
    const stats = await chrome.storage.local.get('stats');
    if (!stats.stats) {
        await chrome.storage.local.set({ stats: currentStats });
    }
    
    // 检查是否需要重置每日计数
    await checkAndResetDailyCount();
}

// 设置每日重置和自动运行
function setupDailyReset() {
    // 清除所有已存在的定时器
    chrome.alarms.clearAll();
    
    console.log('🕐 设置定时任务...');
    
    // 每小时检查一次是否需要重置（早上9点触发）
    chrome.alarms.create('dailyResetCheck', { periodInMinutes: 60 });
    
    // 每5分钟检查一次是否需要自动运行
    chrome.alarms.create('autoRunCheck', { periodInMinutes: 5 });
    
    chrome.alarms.onAlarm.addListener(async (alarm) => {
        if (alarm.name === 'dailyResetCheck') {
            await checkAndResetDailyCount();
        } else if (alarm.name === 'autoRunCheck') {
            await checkAndRunAutoTask();
        }
    });
    
    console.log('✅ 定时任务已设置');
}

// 检查并重置每日计数
async function checkAndResetDailyCount() {
    const config = await chrome.storage.local.get('config');
    const cfg = config.config || DEFAULT_CONFIG;
    
    if (!cfg.autoResetDaily) return;
    
    // 获取当前时间
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // 获取重置时间（默认早上9点）
    const resetTime = cfg.autoRunResetTime || '09:00';
    const [resetHour, resetMinute] = resetTime.split(':').map(Number);
    
    // 只在重置时间点（早上9点）触发重置
    if (currentHour === resetHour && currentMinute >= 0 && currentMinute < 5) {
        const today = getTodayDateString();
        const stats = await chrome.storage.local.get('stats');
        const currentStats = stats.stats || {};
        
        if (currentStats.lastResetDate !== today) {
            console.log('🔄 重置每日计数和任务状态（时间:', resetTime, '）');
            currentStats.todaySearches = 0;
            currentStats.pcSearches = 0;
            currentStats.mobileSearches = 0;
            currentStats.pointsEarned = 0;
            currentStats.lastResetDate = today;
            
            // 重置任务状态
            currentStats.signTaskCompleted = false;
            currentStats.readTaskCompleted = false;
            currentStats.promoTaskCompleted = false;
            currentStats.searchTaskCompleted = false;
            
            await chrome.storage.local.set({ stats: currentStats });
            sendNotification('每日计数已重置', `🎉 新的一天开始了！所有任务状态已重置。\n重置时间：${resetTime}`);
            
            // 通知 popup 更新状态
            notifyPopupStatusUpdate();
        }
    }
}

// 获取今日日期字符串
function getTodayDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// 获取当前时间字符串（HH:MM）
function getCurrentTimeString() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// 通知 popup 更新状态
function notifyPopupStatusUpdate() {
    chrome.runtime.sendMessage({ 
        action: 'statusUpdated' 
    }).catch(() => {
        // 没有打开的 popup，忽略错误
    });
}

// 检查并自动运行任务
async function checkAndRunAutoTask() {
    const config = await chrome.storage.local.get('config');
    const cfg = config.config || DEFAULT_CONFIG;
    
    // 检查是否启用自动运行
    if (!cfg.autoRunEnabled) {
        return;
    }
    
    // 检查是否在运行中
    const status = await getStatus();
    if (status.isRunning) {
        console.log('ℹ️ 任务已在运行中，跳过自动运行检查');
        return;
    }
    
    // 获取当前时间
    const currentTime = getCurrentTimeString();
    const today = getTodayDateString();
    
    // 检查今日是否已自动运行
    const autoRunHistory = await chrome.storage.local.get('autoRunHistory');
    const history = autoRunHistory.autoRunHistory || {};
    const todayHistory = history[today] || [];
    
    // 检查是否在自动运行时间段内
    const timeSlots = cfg.autoRunTimeSlots || [];
    for (const slot of timeSlots) {
        if (currentTime >= slot.start && currentTime <= slot.end) {
            const slotKey = `${slot.start}-${slot.end}`;
            
            // 检查该时间段今日是否已运行
            if (!todayHistory.includes(slotKey)) {
                console.log(`🚀 触发自动运行（时间段: ${slotKey}, 当前时间: ${currentTime}）`);
                
                // 检查授权状态（只在自动运行时检测）
                await checkAuthBeforeAutoRun();
                
                // 记录自动运行历史
                todayHistory.push(slotKey);
                history[today] = todayHistory;
                await chrome.storage.local.set({ autoRunHistory: history });
                
                // 发送通知
                sendNotification('自动运行开始', `🤖 触发自动运行任务\n时间段: ${slot.start}~${slot.end}\n当前时间: ${currentTime}`);
                
                // 启动任务
                await startSearchTask();
                
                return;
            } else {
                console.log(`ℹ️ 时间段 ${slotKey} 今日已自动运行，跳过`);
            }
        }
    }
}

// 自动运行前检查授权状态
async function checkAuthBeforeAutoRun() {
    console.log('🔍 自动运行前检查授权状态...');
    
    const tokenStatus = await checkTokenStatus();
    console.log('📊 Token状态:', tokenStatus);
    
    // 检查是否需要OAuth授权的任务
    const config = await chrome.storage.local.get('config');
    let cfg = config.config || DEFAULT_CONFIG;
    const needsAuth = cfg.enableSignTask || cfg.enableReadTask || cfg.enablePromoTask;
    
    if (needsAuth) {
        if (!tokenStatus.hasAccessToken || tokenStatus.isExpired) {
            console.log('⚠️ 检测到需要授权的任务，但Token状态无效');
            
            if (tokenStatus.hasRefreshToken) {
                console.log('🔄 尝试自动刷新 Access Token...');
                const newToken = await refreshAccessToken(cfg.refreshToken);
                if (newToken) {
                    console.log('✅ Access Token 自动刷新成功');
                } else {
                    console.log('❌ Access Token 自动刷新失败，启动自动授权流程');
                    // 等待授权完成
                    const authCompleted = await handleMissingAuthWithWait(cfg);
                    if (authCompleted) {
                        console.log('✅ 授权已完成，重新读取配置');
                        // 重新读取配置以获取更新后的配置
                        const configUpdated = await chrome.storage.local.get('config');
                        cfg = configUpdated.config || cfg;
                    } else {
                        console.log('⚠️ 授权未完成，禁用需要授权的任务');
                        // 禁用需要授权的任务
                        cfg.enableSignTask = false;
                        cfg.enableReadTask = false;
                        cfg.enablePromoTask = false;
                        await chrome.storage.local.set({ config: cfg });
                    }
                }
            } else {
                console.log('💡 没有 Refresh Token，启动自动授权流程');
                // 等待授权完成
                const authCompleted = await handleMissingAuthWithWait(cfg);
                if (authCompleted) {
                    console.log('✅ 授权已完成，重新读取配置');
                    // 重新读取配置以获取更新后的配置
                    const configUpdated = await chrome.storage.local.get('config');
                    cfg = configUpdated.config || cfg;
                } else {
                    console.log('⚠️ 授权未完成，禁用需要授权的任务');
                    // 禁用需要授权的任务
                    cfg.enableSignTask = false;
                    cfg.enableReadTask = false;
                    cfg.enablePromoTask = false;
                    await chrome.storage.local.set({ config: cfg });
                }
            }
        } else {
            console.log('✅ OAuth授权状态正常，可以执行所有任务');
        }
    } else {
        console.log('ℹ️ 未启用需要OAuth授权的任务，跳过授权检查');
    }
}

// 签入任务
async function taskSign() {
    const config = await chrome.storage.local.get('config');
    const cfg = config.config || DEFAULT_CONFIG;
    const stats = await chrome.storage.local.get('stats');
    const currentStatsData = stats.stats || {};
    
    // 检查任务是否已完成
    if (currentStatsData.signTaskCompleted) {
        console.log('✅ 签入任务已完成');
        return true;
    }
    
    // 检查任务是否启用
    if (!cfg.enableSignTask) {
        console.log('⏭️ 签入任务未启用');
        return true;
    }
    
    try {
        console.log('📝 开始执行签入任务...');
        
        const accessToken = await getAccessToken();
        if (!accessToken) {
            console.error('❌ 签入任务失败：无法获取Access Token');
            console.error('💡 提示：请先点击插件图标，然后点击"🔑 打开授权页面"完成Microsoft账户授权');
            sendNotification('授权未完成', '🔐 请先完成OAuth授权才能执行签入任务\n点击插件图标→打开授权页面');
            return false;
        }
        
        const region = 'cn';
        const response = await fetch('https://prod.rewardsplatform.microsoft.com/dapi/me/activities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'User-Agent': USER_AGENTS.mobile,
                'Authorization': `Bearer ${accessToken}`,
                'x-rewards-appid': 'SAAndroid/31.4.2110003555',
                'x-rewards-ismobile': 'true',
                'x-rewards-country': region,
                'x-rewards-partnerid': 'startapp',
                'x-rewards-flights': 'rwgobig'
            },
            body: JSON.stringify({
                "amount": 1,
                "attributes": {},
                "id": crypto.randomUUID(),
                "type": 103,
                "country": region,
                "risk_context": {},
                "channel": "SAAndroid"
            })
        });
        
        const data = await response.json();
        
        if (data.response && data.response.activity) {
            const points = data.response.activity.p || 0;
            
            currentStatsData.signTaskCompleted = true;
            currentStatsData.pointsEarned += points;
            await chrome.storage.local.set({ stats: currentStatsData });
            
            console.log(`✅ 签入任务完成！获得 ${points} 积分`);
            sendNotification('签入任务完成', `🎉 今日签入完成！获得 ${points} 积分`);
            
            // 通知 popup 更新状态
            notifyPopupStatusUpdate();
            
            return true;
        }
    } catch (error) {
        console.error('❌ 签入任务失败:', error);
    }
    
    return false;
}

// 阅读任务
async function taskRead() {
    const config = await chrome.storage.local.get('config');
    const cfg = config.config || DEFAULT_CONFIG;
    const stats = await chrome.storage.local.get('stats');
    const currentStatsData = stats.stats || {};
    
    // 检查任务是否已完成
    if (currentStatsData.readTaskCompleted) {
        console.log('✅ 阅读任务已完成');
        return true;
    }
    
    // 检查任务是否启用
    if (!cfg.enableReadTask) {
        console.log('⏭️ 阅读任务未启用');
        return true;
    }
    
    try {
        console.log('📖 开始执行阅读任务...');
        
        const accessToken = await getAccessToken();
        if (!accessToken) {
            console.error('❌ 阅读任务失败：无法获取Access Token');
            console.error('💡 提示：请先点击插件图标，然后点击"🔑 打开授权页面"完成Microsoft账户授权');
            sendNotification('授权未完成', '🔐 请先完成OAuth授权才能执行阅读任务\n点击插件图标→打开授权页面');
            return false;
        }
        
        // 获取阅读进度
        const progressResponse = await fetch('https://prod.rewardsplatform.microsoft.com/dapi/me?channel=SAAndroid&options=613', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': USER_AGENTS.mobile,
                'Authorization': `Bearer ${accessToken}`,
                'x-rewards-appid': 'SAAndroid/31.4.2110003555',
                'x-rewards-ismobile': 'true'
            }
        });
        
        const progressData = await progressResponse.json();
        let readProgress = { max: 1, progress: 0 };
        
        if (progressData.response && progressData.response.promotions) {
            for (const promo of progressData.response.promotions) {
                if (promo.attributes.offerid === 'ENUS_readarticle3_30points') {
                    readProgress = {
                        max: Number(promo.attributes.max),
                        progress: Number(promo.attributes.progress)
                    };
                    break;
                }
            }
        }
        
        if (readProgress.progress >= readProgress.max) {
            currentStatsData.readTaskCompleted = true;
            await chrome.storage.local.set({ stats: currentStatsData });
            console.log('✅ 阅读任务已完成');
            sendNotification('阅读任务完成', `🎉 今日阅读完成！`);
            return true;
        }
        
        console.log(`📖 需要完成 ${readProgress.max - readProgress.progress} 次阅读`);
        console.log(`📊 使用搜索间隔设置：${cfg.searchInterval} 秒（±${cfg.searchInterval * 0.5} 秒）`);
        
        // 执行阅读任务
        const region = 'cn';
        while (readProgress.progress < readProgress.max) {
            const response = await fetch('https://prod.rewardsplatform.microsoft.com/dapi/me/activities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    'User-Agent': USER_AGENTS.mobile,
                    'Authorization': `Bearer ${accessToken}`,
                    'x-rewards-appid': 'SAAndroid/31.4.2110003555',
                    'x-rewards-ismobile': 'true',
                    'x-rewards-country': region
                },
                body: JSON.stringify({
                    "amount": 1,
                    "country": region,
                    "id": crypto.randomUUID(),
                    "type": 101,
                    "attributes": {
                        "offerid": "ENUS_readarticle3_30points"
                    }
                })
            });
            
            const data = await response.json();
            if (data.response && data.response.activity) {
                readProgress.progress++;
                console.log(`📖 阅读进度: ${readProgress.progress}/${readProgress.max}`);
            }
            
            // 使用配置的搜索间隔设置
            const minInterval = cfg.minSearchInterval * 1000;
            const maxInterval = cfg.maxSearchInterval * 1000;
            const randomInterval = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
            console.log(`⏱️ 等待 ${randomInterval / 1000} 秒后继续...`);
            await new Promise(resolve => setTimeout(resolve, randomInterval));
        }
        
        currentStatsData.readTaskCompleted = true;
        currentStatsData.pointsEarned += (readProgress.max * 5); // 假设每次阅读5分
        await chrome.storage.local.set({ stats: currentStatsData });
        
        console.log('✅ 阅读任务完成！');
        sendNotification('阅读任务完成', `🎉 今日阅读完成！共完成 ${readProgress.max} 次阅读`);
        
        // 通知 popup 更新状态
        notifyPopupStatusUpdate();
        
        return true;
    } catch (error) {
        console.error('❌ 阅读任务失败:', error);
    }
    
    return false;
}

// 活动任务
async function taskPromo() {
    const config = await chrome.storage.local.get('config');
    const cfg = config.config || DEFAULT_CONFIG;
    const stats = await chrome.storage.local.get('stats');
    const currentStatsData = stats.stats || {};
    
    // 检查任务是否已完成
    if (currentStatsData.promoTaskCompleted) {
        console.log('✅ 活动任务已完成');
        return true;
    }
    
    // 检查任务是否启用
    if (!cfg.enablePromoTask) {
        console.log('⏭️ 活动任务未启用');
        return true;
    }
    
    try {
        console.log('🎁 开始执行活动任务...');
        
        // 预检查：先尝试访问rewards.bing.com主页检查登录状态
        console.log('🔍 检查Microsoft Rewards登录状态...');
        const loginCheckResponse = await fetch('https://rewards.bing.com/', {
            method: 'HEAD',
            redirect: 'manual'
        });
        
        // 如果重定向到登录页面，提示用户需要登录
        if (loginCheckResponse.status === 302 || loginCheckResponse.status === 301) {
            const location = loginCheckResponse.headers.get('location') || '';
            if (location.includes('login.live.com')) {
                console.error('❌ 检测到未登录Microsoft账户');
                sendNotification('需要登录', '🔐 请先登录Microsoft Rewards账户\n访问 https://rewards.bing.com 完成登录');
                return false;
            }
        }
        
        // 获取Dashboard信息
        console.log('📊 获取Microsoft Rewards Dashboard信息...');
        const dashboardResponse = await fetch('https://rewards.bing.com/api/getuserinfo?type=1&X-Requested-With=XMLHttpRequest&_=' + Date.now(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Referer': 'https://rewards.bing.com/'
            },
            credentials: 'include'
        });
        
        console.log('📊 Dashboard响应状态:', dashboardResponse.status);
        
        if (!dashboardResponse.ok) {
            console.error('❌ Dashboard请求失败，状态码:', dashboardResponse.status);
            return false;
        }
        
        let dashboardData;
        try {
            dashboardData = await dashboardResponse.json();
        } catch (jsonError) {
            const textData = await dashboardResponse.text();
            console.error('❌ Dashboard响应不是有效的JSON');
            console.error('❌ 响应内容:', textData.substring(0, 500)); // 只显示前500个字符
            
            // 检查是否是登录页面
            if (textData.includes('login.live.com') || textData.includes('登录') || textData.includes('Sign in')) {
                console.error('💡 检测到需要登录Microsoft账户');
                sendNotification('需要登录', '🔐 请先登录Microsoft Rewards账户\n访问 https://rewards.bing.com 完成登录');
            } else {
                sendNotification('活动任务失败', '❌ 无法获取Microsoft Rewards信息\n请检查网络连接或重新登录');
            }
            return false;
        }
        
        if (!dashboardData.dashboard) {
            console.error('❌ Dashboard数据格式错误:', dashboardData);
            return false;
        }
        
        // 获取活动列表
        const today = getTodayDateString();
        const dailySetPromos = dashboardData.dashboard.dailySetPromotions[today] || [];
        const morePromos = dashboardData.dashboard.morePromotions || [];
        
        const promosArr = [];
        for (const item of [...dailySetPromos, ...morePromos]) {
            if (item.complete === false && item.priority > -2 && item.exclusiveLockedFeatureStatus !== 'locked') {
                promosArr.push({
                    id: item.offerId,
                    hash: item.hash,
                    url: item.destinationUrl
                });
            }
        }
        
        if (promosArr.length === 0) {
            currentStatsData.promoTaskCompleted = true;
            await chrome.storage.local.set({ stats: currentStatsData });
            console.log('✅ 活动任务完成（无可执行活动）');
            console.log('💡 可能所有活动都已完成，或者当前没有可用活动');
            sendNotification('活动任务完成', '🎉 今日活动完成！\n没有找到新的可执行活动\n可能所有活动都已完成');
            return true;
        }
        
        console.log(`📋 找到 ${promosArr.length} 个活动`);
        
        // 执行活动
        let completedCount = 0;
        for (const promo of promosArr) {
            try {
                console.log(`🎯 开始执行活动: ${promo.id}`);
                console.log(`🔗 活动URL: ${promo.url}`);
                
                // 方案1: 尝试访问活动URL（模拟用户点击）
                const visitResponse = await fetch(promo.url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                        'Referer': 'https://rewards.bing.com/'
                    },
                    credentials: 'include'
                });
                
                console.log(`📊 访问活动URL响应状态: ${visitResponse.status}`);
                
                if (visitResponse.ok) {
                    // 访问成功，尝试提交活动报告
                    const reportResponse = await fetch('https://rewards.bing.com/api/reportactivity?X-Requested-With=XMLHttpRequest', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                            'Referer': promo.url,
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        credentials: 'include',
                        body: new URLSearchParams({
                            'id': promo.id,
                            'hash': promo.hash,
                            'timeZone': 480,
                            'activityAmount': 1,
                            'dbs': 0,
                            'form': '',
                            'type': ''
                        }).toString()
                    });
                    
                    console.log(`📊 提交活动报告响应状态: ${reportResponse.status}`);
                    
                    if (reportResponse.ok || reportResponse.status === 400) {
                        // 200 或 400 都可能表示任务已完成
                        // 400 可能是因为活动已经完成或参数问题，但我们仍然尝试
                        completedCount++;
                        console.log(`✅ 活动完成 (${completedCount}/${promosArr.length}): ${promo.id}`);
                    } else {
                        console.warn(`⚠️ 提交活动报告失败: ${reportResponse.status}`);
                    }
                } else {
                    console.warn(`⚠️ 访问活动URL失败: ${visitResponse.status}`);
                }
                
                // 使用配置的搜索间隔设置（使用最小间隔以加快活动完成速度）
                const config = await chrome.storage.local.get('config');
                const taskConfig = config.config || DEFAULT_CONFIG;
                const minInterval = taskConfig.minSearchInterval * 1000;
                const randomInterval = Math.floor(Math.random() * minInterval) + minInterval / 2;
                console.log(`⏱️ 等待 ${randomInterval / 1000} 秒后继续...`);
                await new Promise(resolve => setTimeout(resolve, randomInterval));
            } catch (error) {
                console.error(`❌ 活动执行失败 (${promo.id}):`, error);
                console.error(`❌ 活动详情:`, promo);
            }
        }
        
        currentStatsData.promoTaskCompleted = true;
        currentStatsData.pointsEarned += (completedCount * 10); // 假设每个活动10分
        await chrome.storage.local.set({ stats: currentStatsData });
        
        console.log(`✅ 活动任务完成！共完成 ${completedCount} 个活动`);
        
        if (completedCount === 0) {
            sendNotification('活动任务完成', '🎉 今日活动完成！\n没有找到新的可执行活动\n可能所有活动都已完成');
        } else if (completedCount < promosArr.length) {
            sendNotification('活动任务完成', `🎉 今日活动完成！\n共完成 ${completedCount}/${promosArr.length} 个活动\n部分活动可能遇到问题`);
        } else {
            sendNotification('活动任务完成', `🎉 今日活动完成！\n共完成 ${completedCount} 个活动`);
        }
        
        // 通知 popup 更新状态
        notifyPopupStatusUpdate();
        
        return true;
    } catch (error) {
        console.error('❌ 活动任务失败:', error);
        console.error('💡 可能的原因：');
        console.error('   1. 需要登录Microsoft Rewards账户');
        console.error('   2. 网络连接问题');
        console.error('   3. Microsoft Rewards服务暂时不可用');
        console.error('   4. 活动任务API已变更');
        sendNotification('活动任务失败', '❌ 无法完成活动任务\n请确保已登录Microsoft Rewards账户\n或检查网络连接\n访问 https://rewards.bing.com 查看状态');
    }
    
    return false;
}

// 生成随机搜索词
async function generateRandomSearchWord() {
    const config = await chrome.storage.local.get('config');
    const cfg = config.config || DEFAULT_CONFIG;
    
    // 根据配置选择搜索词模式
    if (cfg.searchWordMode === 'random') {
        return generateRandomWordFallback();
    }
    
    // 词典模式（默认）
    return generateDictionaryWord();
}

// 从词典中生成搜索词
function generateDictionaryWord() {
    // 获取所有词典类别
    const categories = Object.keys(SEARCH_DICTIONARY);
    // 随机选择一个类别
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    // 从该类别中随机选择一个搜索词
    const categoryWords = SEARCH_DICTIONARY[randomCategory];
    const randomWord = categoryWords[Math.floor(Math.random() * categoryWords.length)];
    
    // 有30%概率添加额外的关键词组合，增加搜索多样性
    if (Math.random() < 0.3) {
        const extraCategory = categories[Math.floor(Math.random() * categories.length)];
        const extraWords = SEARCH_DICTIONARY[extraCategory];
        const extraWord = extraWords[Math.floor(Math.random() * extraWords.length)];
        return `${randomWord} ${extraWord}`;
    }
    
    return randomWord;
}

// 生成随机搜索词（随机模式 - 使用随机汉字组合）
function generateRandomWordFallback() {
    const length = Math.floor(Math.random() * 8) + 2; // 2-10个字
    let word = '';
    for (let i = 0; i < length; i++) {
        word += CHINESE_CHARS[Math.floor(Math.random() * CHINESE_CHARS.length)];
    }
    return word;
}

// 执行Bing搜索
async function performSearch(isMobile = false) {
    // 检查任务是否已停止
    if (!isTaskRunning) {
        console.log('⚠️ 任务已停止，取消此次搜索');
        return false;
    }

    // 设置搜索锁
    if (isSearching) {
        console.log('⚠️ 已有搜索在进行中，跳过此次请求');
        return false;
    }
    isSearching = true;

    try {
        const config = await chrome.storage.local.get('config');
        const cfg = config.config || DEFAULT_CONFIG;
        const stats = await chrome.storage.local.get('stats');
        const currentStatsData = stats.stats || {};
        
        // 检查是否达到每日限制
        if (cfg.enableDailyLimit && currentStatsData.todaySearches >= cfg.maxDailySearches) {
            sendNotification('已达到每日搜索限制', `今日已搜索 ${currentStatsData.todaySearches} 次，达到限制。`);
            return false;
        }
        
        // 检查特定类型的搜索限制
        if (isMobile && currentStatsData.mobileSearches >= cfg.mobileSearchMax) {
            console.log('移动搜索已达上限');
            return false;
        }
        if (!isMobile && currentStatsData.pcSearches >= cfg.pcSearchMax) {
            console.log('电脑搜索已达上限');
            return false;
        }
        
        const searchWord = await generateRandomSearchWord();
        const bingUrl = isMobile
            ? `https://m.bing.com/search?q=${encodeURIComponent(searchWord)}&form=QBLH&mkt=zh-CN`
            : `https://cn.bing.com/search?q=${encodeURIComponent(searchWord)}&form=QBLH`;

        console.log(`开始搜索: ${searchWord} (${isMobile ? '移动' : '电脑'})`);
        console.log(`URL: ${bingUrl}`);

        // 设置User-Agent
        const userAgent = isMobile ? USER_AGENTS.mobile : USER_AGENTS.desktop;
        console.log(`使用User-Agent: ${userAgent.substring(0, 50)}...`);

        try {
            // 使用fetch发送请求
            const response = await fetch(bingUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                },
                credentials: 'include'
            });

            console.log(`✓ 请求状态: ${response.status}`);

            // 读取响应内容以确保请求完成
            await response.text();
            console.log(`✓ 搜索完成: ${searchWord} (${isMobile ? '移动' : '电脑'})`);

        } catch (error) {
            console.error('❌ 搜索请求失败:', error);
            return false;
        }

        // 更新统计信息
        currentStatsData.todaySearches++;
        if (isMobile) {
            currentStatsData.mobileSearches++;
        } else {
            currentStatsData.pcSearches++;
        }
        currentStatsData.lastSearchTime = Date.now();
        
        // 检查搜索任务是否完成
        if (currentStatsData.pcSearches >= cfg.pcSearchMax && currentStatsData.mobileSearches >= cfg.mobileSearchMax) {
            currentStatsData.searchTaskCompleted = true;
            console.log('✅ 搜索任务已完成');
        }

        await chrome.storage.local.set({ stats: currentStatsData });
        
        // 通知 popup 更新状态
        notifyPopupStatusUpdate();

        console.log('任务状态检查 - isTaskRunning:', isTaskRunning);
        return true;

    } catch (error) {
        console.error('❌ 搜索执行失败:', error);
        return false;
    } finally {
        // 释放搜索锁
        isSearching = false;
    }
}

// 处理缺少授权的情况（辅助函数）
async function handleMissingAuth(config) {
    console.log('🚨 处理缺少授权的情况');
    
    // 如果没有提供配置，从存储中获取
    if (!config || Object.keys(config).length === 0) {
        const storedConfig = await chrome.storage.local.get('config');
        config = storedConfig.config || DEFAULT_CONFIG;
    }
    
    // 保存用户的原始任务配置，授权成功后恢复
    const originalTaskConfig = {
        enableSignTask: config.enableSignTask,
        enableReadTask: config.enableReadTask,
        enablePromoTask: config.enablePromoTask
    };
    await chrome.storage.local.set({ savedTaskConfig: originalTaskConfig });
    console.log('💾 已保存原始任务配置:', originalTaskConfig);
    
    // 自动打开授权页面
    console.log('🔓 自动打开授权页面...');
    const authUrl = `${OAUTH_CONFIG.authUrl}?client_id=${OAUTH_CONFIG.clientId}&scope=${encodeURIComponent(OAUTH_CONFIG.scope)}&response_type=code&redirect_uri=${encodeURIComponent(OAUTH_CONFIG.redirectUri)}`;
    
    try {
        const tab = await chrome.tabs.create({ url: authUrl, active: true });
        console.log('✅ 授权页面已打开，Tab ID:', tab.id);
        
        // 发送通知告知用户
        sendNotification('需要OAuth授权', '🔐 检测到需要授权的任务\n已自动打开授权页面\n请登录 Microsoft 账户\n授权将自动完成并关闭页面');
        
        // 只执行搜索任务
        console.log('🔄 调整任务配置：只执行搜索任务');
        config.enableSignTask = false;
        config.enableReadTask = false;
        config.enablePromoTask = false;
        
        // 保存调整后的配置
        await chrome.storage.local.set({ config: config });
        
        // 监听授权页面的 URL 变化
        monitorAuthPage(tab.id);
    } catch (error) {
        console.error('❌ 打开授权页面失败:', error);
        sendNotification('授权失败', '❌ 无法打开授权页面\n请手动点击插件图标→打开授权页面');
    }
}

// 处理缺少授权的情况（带等待）
async function handleMissingAuthWithWait(config) {
    console.log('🚨 处理缺少授权的情况（带等待）');
    
    // 如果没有提供配置，从存储中获取
    if (!config || Object.keys(config).length === 0) {
        const storedConfig = await chrome.storage.local.get('config');
        config = storedConfig.config || DEFAULT_CONFIG;
    }
    
    // 保存用户的原始任务配置，授权成功后恢复
    const originalTaskConfig = {
        enableSignTask: config.enableSignTask,
        enableReadTask: config.enableReadTask,
        enablePromoTask: config.enablePromoTask
    };
    await chrome.storage.local.set({ savedTaskConfig: originalTaskConfig });
    console.log('💾 已保存原始任务配置:', originalTaskConfig);
    
    // 自动打开授权页面
    console.log('🔓 自动打开授权页面...');
    const authUrl = `${OAUTH_CONFIG.authUrl}?client_id=${OAUTH_CONFIG.clientId}&scope=${encodeURIComponent(OAUTH_CONFIG.scope)}&response_type=code&redirect_uri=${encodeURIComponent(OAUTH_CONFIG.redirectUri)}`;
    
    try {
        const tab = await chrome.tabs.create({ url: authUrl, active: true });
        console.log('✅ 授权页面已打开，Tab ID:', tab.id);
        
        // 发送通知告知用户
        sendNotification('需要OAuth授权', '🔐 检测到需要授权的任务\n已自动打开授权页面\n请登录 Microsoft 账户\n授权将自动完成并关闭页面');
        
        // 只执行搜索任务
        console.log('🔄 调整任务配置：只执行搜索任务');
        config.enableSignTask = false;
        config.enableReadTask = false;
        config.enablePromoTask = false;
        
        // 保存调整后的配置
        await chrome.storage.local.set({ config: config });
        
        // 监听授权页面的 URL 变化（带等待）
        const authCompleted = await monitorAuthPageWithWait(tab.id);
        return authCompleted;
    } catch (error) {
        console.error('❌ 打开授权页面失败:', error);
        sendNotification('授权失败', '❌ 无法打开授权页面\n请手动点击插件图标→打开授权页面');
        return false;
    }
}

// 监听授权页面，检测授权完成
function monitorAuthPage(tabId) {
    console.log('👀 开始监听授权页面，Tab ID:', tabId);
    
    // 使用 chrome.tabs.onUpdated 监听 URL 变化
    const updateListener = (updatedTabId, changeInfo, updatedTab) => {
        if (updatedTabId === tabId && changeInfo.url) {
            console.log('🔄 授权页面 URL 变化:', changeInfo.url);
            
            // 检查是否包含授权码
            if (changeInfo.url.includes('code=')) {
                console.log('✅ 检测到授权成功，URL 包含 code 参数');
                
                // 提取授权码
                try {
                    const urlObj = new URL(changeInfo.url);
                    const code = urlObj.searchParams.get('code');
                    
                    if (code) {
                        console.log('🔑 成功提取授权码，长度:', code.length);
                        
                        // 移除监听器
                        chrome.tabs.onUpdated.removeListener(updateListener);
                        
                        // 保存授权码
                        saveAuthCodeAndCloseTab(code, tabId);
                    }
                } catch (error) {
                    console.error('❌ 提取授权码失败:', error);
                }
            }
        }
    };
    
    // 添加监听器
    chrome.tabs.onUpdated.addListener(updateListener);
    
    // 60秒后自动移除监听器（超时）
    setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(updateListener);
        console.log('⏰ 授权页面监听超时');
    }, 60000);
}

// 监听授权页面，检测授权完成（带等待）
function monitorAuthPageWithWait(tabId) {
    return new Promise((resolve, reject) => {
        console.log('👀 开始监听授权页面（带等待），Tab ID:', tabId);
        
        let resolved = false;
        
        // 使用 chrome.tabs.onUpdated 监听 URL 变化
        const updateListener = (updatedTabId, changeInfo, updatedTab) => {
            if (updatedTabId === tabId && changeInfo.url) {
                console.log('🔄 授权页面 URL 变化:', changeInfo.url);
                
                // 检查是否包含授权码
                if (changeInfo.url.includes('code=')) {
                    console.log('✅ 检测到授权成功，URL 包含 code 参数');
                    
                    if (!resolved) {
                        resolved = true;
                        
                        // 提取授权码
                        try {
                            const urlObj = new URL(changeInfo.url);
                            const code = urlObj.searchParams.get('code');
                            
                            if (code) {
                                console.log('🔑 成功提取授权码，长度:', code.length);
                                
                                // 移除监听器
                                chrome.tabs.onUpdated.removeListener(updateListener);
                                
                                // 保存授权码并关闭标签页
                                saveAuthCodeAndCloseTab(code, tabId).then(() => {
                                    resolve(true);
                                }).catch((error) => {
                                    console.error('❌ 保存授权码失败:', error);
                                    resolve(false);
                                });
                            } else {
                                console.error('❌ 无法提取授权码');
                                resolve(false);
                            }
                        } catch (error) {
                            console.error('❌ 提取授权码失败:', error);
                            resolve(false);
                        }
                    }
                }
            }
        };
        
        // 添加监听器
        chrome.tabs.onUpdated.addListener(updateListener);
        
        // 60秒后自动移除监听器（超时）
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                chrome.tabs.onUpdated.removeListener(updateListener);
                console.log('⏰ 授权页面监听超时');
                resolve(false);
            }
        }, 60000);
    });
}

// 保存授权码并关闭标签页
async function saveAuthCodeAndCloseTab(authCode, tabId) {
    try {
        console.log('💾 保存授权码并关闭授权页面...');
        
        // 调用保存授权码函数
        const success = await saveAuthCode(authCode);
        
        if (success) {
            console.log('✅ 授权码保存成功');
            
            // 关闭授权页面
            try {
                await chrome.tabs.remove(tabId);
                console.log('✅ 授权页面已关闭');
            } catch (closeError) {
                console.error('⚠️ 关闭授权页面失败:', closeError);
            }
            
            // 发送成功通知
            sendNotification('授权成功', '🎉 OAuth 授权已完成\n所有任务现已启用\n可以重新开始任务');
            
            // 通知 popup 更新授权状态
            notifyPopupAuthStatus();
            
            // 恢复任务配置（如果之前被禁用了）
            const config = await chrome.storage.local.get('config');
            const cfg = config.config || {};
            
            // 检查是否有之前保存的任务配置
            const savedTaskConfig = await chrome.storage.local.get('savedTaskConfig');
            if (savedTaskConfig.savedTaskConfig) {
                console.log('🔄 恢复之前的任务配置');
                cfg.enableSignTask = savedTaskConfig.savedTaskConfig.enableSignTask;
                cfg.enableReadTask = savedTaskConfig.savedTaskConfig.enableReadTask;
                cfg.enablePromoTask = savedTaskConfig.savedTaskConfig.enablePromoTask;
                
                await chrome.storage.local.set({ config: cfg });
                await chrome.storage.local.remove('savedTaskConfig');
            }
            
            return true;
        } else {
            console.error('❌ 授权码保存失败');
            sendNotification('授权失败', '❌ 保存授权码失败\n请重试授权');
            return false;
        }
    } catch (error) {
        console.error('❌ 保存授权码并关闭标签页失败:', error);
        return false;
    }
}

// 通知 popup 更新授权状态
function notifyPopupAuthStatus() {
    // 尝试发送消息给 popup
    chrome.runtime.sendMessage({ action: 'authCompleted' }, (response) => {
        if (chrome.runtime.lastError) {
            console.log('ℹ️ Popup 未打开，无法通知');
        } else {
            console.log('✅ 已通知 popup 更新授权状态');
        }
    });
}

// 搜索任务调度
let searchInterval = null;
let isSearching = false; // 搜索锁，防止多个搜索同时执行
let isTaskRunning = false; // 任务运行状态标志

async function startSearchTask() {
    console.log('🚀 启动完整任务流程...');
    
    const config = await chrome.storage.local.get('config');
    const cfg = config.config || DEFAULT_CONFIG;

    // 停止之前的搜索任务
    if (searchInterval) {
        clearTimeout(searchInterval);
        searchInterval = null;
    }

    // 重置搜索锁和任务状态
    isSearching = false;
    isTaskRunning = true;
    
    // 通知 popup 更新状态
    notifyPopupStatusUpdate();

    await checkAndResetDailyCount();
    
    // 检查是否需要OAuth授权的任务
    
        const needsAuth = cfg.enableSignTask || cfg.enableReadTask || cfg.enablePromoTask;
    
        if (needsAuth) {
    
            console.log('🔍 检查OAuth授权状态...');
    
            const tokenStatus = await checkTokenStatus();
    
            console.log('📊 Token状态:', tokenStatus);
    
            
    
            if (!tokenStatus.hasAccessToken || tokenStatus.isExpired) {
    
                console.log('⚠️ 检测到需要OAuth授权的任务，但Token状态无效');
    
                
    
                // 检查是否有 Refresh Token 可以自动刷新
    
                if (tokenStatus.hasRefreshToken) {
    
                    console.log('🔄 尝试自动刷新 Access Token...');
    
                    const newToken = await refreshAccessToken(cfg.refreshToken);
    
                    if (newToken) {
    
                        console.log('✅ Access Token 自动刷新成功');
    
                        // 重新读取配置以获取更新后的 token
    
                        const configUpdated = await chrome.storage.local.get('config');
    
                        const cfgUpdated = configUpdated.config || cfg;
    
                        // 继续执行任务，使用更新后的配置
    
                        console.log('✅ OAuth授权状态正常，可以执行所有任务');
    
                        // 使用更新后的配置继续执行任务
    
                        cfg.accessToken = cfgUpdated.accessToken;
    
                        cfg.refreshToken = cfgUpdated.refreshToken;
    
                        cfg.tokenExpiry = cfgUpdated.tokenExpiry;
    
                    } else {
    
                        console.log('❌ Access Token 自动刷新失败，启动自动授权流程');
    
                        // 等待授权完成
    
                        const authCompleted = await handleMissingAuthWithWait(cfg);
    
                        if (!authCompleted) {
    
                            console.log('⚠️ 授权未完成，跳过需要授权的任务');
    
                            cfg.enableSignTask = false;
    
                            cfg.enableReadTask = false;
    
                            cfg.enablePromoTask = false;
    
                        } else {
    
                            console.log('✅ 授权已完成，恢复任务配置');
    
                            // 重新读取配置以获取更新后的配置
    
                            const configUpdated = await chrome.storage.local.get('config');
    
                            const cfgUpdated = configUpdated.config || cfg;
    
                            cfg.enableSignTask = cfgUpdated.enableSignTask;
    
                            cfg.enableReadTask = cfgUpdated.enableReadTask;
    
                            cfg.enablePromoTask = cfgUpdated.enablePromoTask;
    
                        }
    
                    }
    
                } else {
    
                    console.log('💡 没有 Refresh Token，启动自动授权流程');
    
                    // 等待授权完成
    
                    const authCompleted = await handleMissingAuthWithWait(cfg);
    
                    if (!authCompleted) {
    
                        console.log('⚠️ 授权未完成，跳过需要授权的任务');
    
                        cfg.enableSignTask = false;
    
                        cfg.enableReadTask = false;
    
                        cfg.enablePromoTask = false;
    
                    } else {
    
                        console.log('✅ 授权已完成，恢复任务配置');
    
                        // 重新读取配置以获取更新后的配置
    
                        const configUpdated = await chrome.storage.local.get('config');
    
                        const cfgUpdated = configUpdated.config || cfg;
    
                        cfg.enableSignTask = cfgUpdated.enableSignTask;
    
                        cfg.enableReadTask = cfgUpdated.enableReadTask;
    
                        cfg.enablePromoTask = cfgUpdated.enablePromoTask;
    
                    }
    
                }
    
            } else {
    
                console.log('✅ OAuth授权状态正常，可以执行所有任务');
    
            }
    
        } else {
    
            console.log('ℹ️ 未启用需要OAuth授权的任务，跳过授权检查');
    
        }
    
        
    
        // 执行其他任务（签入、阅读、活动）
    
        console.log('📋 开始执行前置任务...');    console.log('📋 任务配置:', {
        enableSignTask: cfg.enableSignTask,
        enableReadTask: cfg.enableReadTask,
        enablePromoTask: cfg.enablePromoTask,
        enableSearchTask: cfg.enableSearchTask
    });
    
    // 签入任务
    if (cfg.enableSignTask) {
        console.log('📝 执行签入任务...');
        await taskSign();
        // 使用配置的间隔设置
        const interval = cfg.searchInterval * 1000;
        console.log(`⏱️ 等待 ${interval / 1000} 秒后继续...`);
        await new Promise(resolve => setTimeout(resolve, interval));
    } else {
        console.log('⏭️ 签入任务未启用，跳过');
    }
    
    // 阅读任务
    if (cfg.enableReadTask) {
        console.log('📖 执行阅读任务...');
        await taskRead();
        // 使用配置的间隔设置
        const interval = cfg.searchInterval * 1000;
        console.log(`⏱️ 等待 ${interval / 1000} 秒后继续...`);
        await new Promise(resolve => setTimeout(resolve, interval));
    } else {
        console.log('⏭️ 阅读任务未启用，跳过');
    }
    
    // 活动任务
    if (cfg.enablePromoTask) {
        console.log('🎁 执行活动任务...');
        await taskPromo();
        // 使用配置的间隔设置
        const interval = cfg.searchInterval * 1000;
        console.log(`⏱️ 等待 ${interval / 1000} 秒后继续...`);
        await new Promise(resolve => setTimeout(resolve, interval));
    } else {
        console.log('⏭️ 活动任务未启用，跳过');
    }
    
    console.log('✅ 前置任务执行完成，开始搜索任务...');

    // 开始搜索任务
    if (cfg.enableSearchTask) {
        console.log('🔍 开始搜索任务...');
        console.log('📊 搜索配置:', {
            totalMax: cfg.maxDailySearches,
            pcMax: cfg.pcSearchMax,
            mobileMax: cfg.mobileSearchMax,
            interval: cfg.searchInterval
        });
        
        // 立即执行一次搜索
        const isMobile = Math.random() > 0.6; // 40%概率移动搜索
        await performSearch(isMobile);

        // 开始定时搜索循环
        scheduleNextSearch(cfg);
    } else {
        console.log('⏭️ 搜索任务未启用，任务流程结束');
        stopSearchTask();
    }
}

// 调度下一次搜索
function scheduleNextSearch(currentConfig) {
    // 检查任务是否还在运行
    if (!isTaskRunning) {
        console.log('任务已停止，不再调度新的搜索');
        return;
    }

    // 验证配置值，使用默认值
    const minInterval = (currentConfig.minSearchInterval || 15) * 1000;
    const maxInterval = (currentConfig.maxSearchInterval || 45) * 1000;
    const randomInterval = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;

    console.log(`等待 ${randomInterval / 1000} 秒后进行下一次搜索...`);
    console.log(`配置 - minInterval: ${minInterval/1000}s, maxInterval: ${maxInterval/1000}s`);

    searchInterval = setTimeout(async () => {
        // 检查任务是否还在运行
        if (!isTaskRunning) {
            console.log('任务已停止，取消此次搜索');
            return;
        }

        // 重新获取最新配置
        const newConfig = await chrome.storage.local.get('config');
        const cfg = newConfig.config || DEFAULT_CONFIG;

        if (!cfg.enabled) {
            stopSearchTask();
            return;
        }

        // 如果已有搜索在进行，跳过此次搜索但仍然等待间隔时间
        if (isSearching) {
            console.log('上一次搜索还在进行中，等待间隔后重试...');
            // 等待间隔时间后重新调度
            setTimeout(() => {
                if (isTaskRunning) {
                    scheduleNextSearch(cfg);
                }
            }, randomInterval);
            return;
        }

        // 检查每日限制
        const stats = await chrome.storage.local.get('stats');
        const currentStatsData = stats.stats || {};

        if (cfg.enableDailyLimit && currentStatsData.todaySearches >= cfg.maxDailySearches) {
            sendNotification('搜索任务完成', `今日已完成 ${currentStatsData.todaySearches} 次搜索`);
            stopSearchTask();
            return;
        }

        // 随机决定搜索类型
        const isMobile = Math.random() > 0.6;
        await performSearch(isMobile);

        // 如果任务还在运行，调度下一次搜索
        if (isTaskRunning && cfg.enabled) {
            scheduleNextSearch(cfg);
        }
    }, randomInterval);
}

function stopSearchTask() {
    console.log('🛑 开始停止搜索任务...');
    console.log('停止前状态 - isTaskRunning:', isTaskRunning, 'isSearching:', isSearching);

    if (searchInterval) {
        clearTimeout(searchInterval);
        searchInterval = null;
        console.log('✓ 已清除定时器');
    }

    // 重置搜索锁和任务状态
    const wasSearching = isSearching;
    isSearching = false;
    isTaskRunning = false;

    console.log('✓ 搜索任务已停止');
    console.log('停止后状态 - isTaskRunning:', isTaskRunning, 'isSearching:', isSearching);
    console.log('提示：如果有搜索正在进行中，它会完成本次搜索后不再继续');
    
    // 通知 popup 更新状态
    notifyPopupStatusUpdate();
}

// 发送通知
function sendNotification(title, message) {
    chrome.storage.local.get('config').then(config => {
        const cfg = config.config || DEFAULT_CONFIG;
        if (cfg.notificationEnabled) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: title,
                message: message,
                priority: 2
            });
        }
    });
}

// 处理来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'startSearch':
            startSearchTask().then(() => sendResponse({ success: true }));
            return true;
            
        case 'stopSearch':
            console.log('收到stopSearch请求');
            stopSearchTask();
            sendResponse({ success: true });
            return true;
            
        case 'getStatus':
            getStatus().then(status => sendResponse(status));
            return true;
            
        case 'updateConfig':
            updateConfig(request.config).then(() => sendResponse({ success: true }));
            return true;
            
        case 'resetStats':
            resetStats().then(() => sendResponse({ success: true }));
            return true;
            
        case 'getWordPreview':
            const previewWords = [];
            for (let i = 0; i < 5; i++) {
                previewWords.push(generateDictionaryWord());
            }
            sendResponse({ words: previewWords });
            return true;
            
        case 'checkTokenStatus':
            checkTokenStatus().then(status => {
                sendResponse(status);
                // 不再自动触发授权流程，只在自动运行时检测
            });
            return true;
            
        case 'saveAuthCode':
            saveAuthCode(request.authCode).then(success => sendResponse({ success }));
            return true;
            
        case 'clearAuth':
            clearAuth().then(() => sendResponse({ success: true }));
            return true;
            
        case 'startAutoAuth':
            // 自动化授权流程
            handleMissingAuth(DEFAULT_CONFIG).then(() => sendResponse({ success: true }));
            return true;
            
        case 'requestAuthCheck':
            // popup 请求检查授权状态
            checkAndNotifyAuthStatus();
            return true;
    }
});

// 检查授权状态并通知 popup（保留供手动调用）
async function checkAndNotifyAuthStatus() {
    const status = await checkTokenStatus();
    
    // 通知所有打开的 popup
    chrome.runtime.sendMessage({ 
        action: 'authStatusChanged', 
        status: status 
    }).catch(() => {
        // 没有打开的 popup，忽略错误
    });
    
    return status;
}

// 获取当前状态
async function getStatus() {
    const config = await chrome.storage.local.get('config');
    const stats = await chrome.storage.local.get('stats');

    console.log('getStatus - isTaskRunning:', isTaskRunning, 'searchInterval:', searchInterval !== null);

    return {
        config: config.config || DEFAULT_CONFIG,
        stats: stats.stats || currentStats,
        isRunning: isTaskRunning
    };
}

// 更新配置
async function updateConfig(newConfig) {
    console.log('💾 保存配置到 storage...');
    console.log('📋 配置内容:', {
        maxDailySearches: newConfig.maxDailySearches,
        searchInterval: newConfig.searchInterval,
        pcSearchMax: newConfig.pcSearchMax,
        mobileSearchMax: newConfig.mobileSearchMax,
        hasAccessToken: !!newConfig.accessToken,
        hasRefreshToken: !!newConfig.refreshToken
    });
    
    const currentConfig = await chrome.storage.local.get('config');
    const oldConfig = currentConfig.config || {};
    
    const finalConfig = {
        ...newConfig,
        accessToken: newConfig.accessToken || oldConfig.accessToken || null,
        refreshToken: newConfig.refreshToken || oldConfig.refreshToken || null,
        tokenExpiry: newConfig.tokenExpiry || oldConfig.tokenExpiry || null,
        lastResetDate: newConfig.lastResetDate || oldConfig.lastResetDate || null
    };
    
    await chrome.storage.local.set({ config: finalConfig });
    console.log('✅ 配置已保存，OAuth 信息已保留');
    
    // 通知 popup 更新状态
    notifyPopupStatusUpdate();
    
    // 如果配置改变且正在运行，重启搜索任务
    const status = await getStatus();
    if (status.isRunning && !newConfig.enabled) {
        stopSearchTask();
    } else if (!status.isRunning && newConfig.enabled) {
        startSearchTask();
    }
}

// 重置统计信息
async function resetStats() {
    const resetStats = {
        todaySearches: 0,
        pcSearches: 0,
        mobileSearches: 0,
        pointsEarned: 0,
        lastSearchTime: null,
        lastResetDate: getTodayDateString()
    };
    await chrome.storage.local.set({ stats: resetStats });
}

// 启动时检查
chrome.runtime.onStartup.addListener(async () => {
    await initializeStorage();
    setupDailyReset(); // 确保定时器已设置
    
    const config = await chrome.storage.local.get('config');
    const cfg = config.config || DEFAULT_CONFIG;
    
    if (cfg.enabled) {
        await checkAndResetDailyCount();
        startSearchTask();
    }
});