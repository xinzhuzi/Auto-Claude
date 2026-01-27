/**
 * DaoJie Settings - 道劫项目宣传页签
 *
 * 展示道劫游戏项目的联系信息、收款码、社群入口等
 * 水墨画风格设计，诸子百家品牌元素
 */

import { useState, useEffect } from 'react';
import { Wallet, Users, Gamepad2, Tv, QrCode } from 'lucide-react';

interface ContactCard {
  type: 'payment' | 'contact' | 'community' | 'social';
  title: string;
  description: string;
  image: string;
  icon: React.ElementType;
  action?: string;
}

// 图片文件列表
const IMAGE_FILES = [
  'wechat-money-receiving.jpg',
  'alipay-money-receiving.png',
  'wechat-friend.jpg',
  'qq-group.jpg',
  'bilibili-friend.jpg',
  'zhuzibaijia.jpg',
  'AI信息知识库.jpg'
];

// 图片基础路径 - 使用 Vite 的静态资源处理
const IMAGE_BASE_PATH = new URL('../../../../assets/daojie-images', import.meta.url).href;

export function DaoJieSettings() {
  const [images, setImages] = useState<Record<string, string>>({});
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    // 加载图片
    const loadImages = async () => {
      const loadedImages: Record<string, string> = {};

      for (const file of IMAGE_FILES) {
        try {
          // 使用 Vite 的静态资源 URL
          const imagePath = `${IMAGE_BASE_PATH}/${file}`;

          // 验证图片可访问
          const img = new Image();
          img.src = imagePath;
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
          });

          loadedImages[file] = imagePath;
        } catch (err) {
          console.warn(`Failed to load image: ${file}`, err);
          // 图片加载失败时使用占位符
          loadedImages[file] = '';
        }
      }

      setImages(loadedImages);
      setImagesLoaded(true);
    };

    loadImages();
  }, []);

  // 联系卡片数据
  const cards: ContactCard[] = [
    {
      type: 'payment',
      title: '支持',
      description: '微信支付 - 感谢您的赞助',
      image: images['wechat-money-receiving.jpg'] || '',
      icon: Wallet,
      action: '微信'
    },
    {
      type: 'payment',
      title: '支持',
      description: '支付宝 - 感谢您的赞助',
      image: images['alipay-money-receiving.png'] || '',
      icon: Wallet,
      action: '支付宝'
    },
    {
      type: 'contact',
      title: '联系作者',
      description: '竹海晨金 - 提需求、交流合作',
      image: images['wechat-friend.jpg'] || '',
      icon: Users,
      action: '微信'
    },
    {
      type: 'community',
      title: 'QQ 群',
      description: '千年志*道劫 (1019763815)',
      image: images['qq-group.jpg'] || '',
      icon: Users,
      action: '加入群聊'
    },
    {
      type: 'social',
      title: 'B 站',
      description: '诸子百家-谁的天下',
      image: images['bilibili-friend.jpg'] || '',
      icon: Tv,
      action: '关注'
    }
  ];

  const backgroundImage = images['zhuzibaijia.jpg'] || '';

  return (
    <div
      className="daojie-settings relative min-h-[600px] -mx-8 -my-8 px-8 py-8"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* 遮罩层 */}
      {backgroundImage && (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.75) 100%)',
            backdropFilter: 'blur(3px)'
          }}
        />
      )}

      {/* 加载状态 */}
      {!imagesLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className="text-white">加载中...</div>
        </div>
      )}

      {/* 内容区 */}
      <div className="relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* 标题区 */}
          <div className="text-center mb-8">
            <h1
              className="text-4xl font-bold text-white mb-2"
              style={{
                textShadow: '2px 2px 8px rgba(0,0,0,0.6)',
                fontFamily: 'serif'
              }}
            >
              道劫
            </h1>
            <p
              className="text-lg text-amber-100"
              style={{
                textShadow: '1px 1px 4px rgba(0,0,0,0.6)'
              }}
            >
              千年志 · 道劫
            </p>
          </div>

          {/* 招聘广告 */}
          <div className="bg-gradient-to-r from-amber-900/90 via-orange-900/80 to-amber-950/90 rounded-xl p-6 mb-6 backdrop-blur-sm border border-amber-700/30">
            <h2 className="text-xl font-bold text-amber-100 mb-3 flex items-center justify-center gap-2">
              <Gamepad2 className="w-5 h-5" />
              招募贤才
            </h2>
            <p className="text-amber-50 mb-4 text-center">
              道劫项目组诚邀以下人才加入我们的征程：
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { emoji: '🎨', label: '美术设计', detail: '原画、UI、特效、场景、3D角色' },
                { emoji: '💻', label: '程序开发', detail: 'Unity、C#、Python、后端、AI调优' },
                { emoji: '🎮', label: '游戏策划', detail: '主策、系统、关卡、战斗' },
                { emoji: '📝', label: '文案编剧', detail: '世界观、剧情、对话' }
              ].map((role) => (
                <div
                  key={role.label}
                  className="bg-black/40 rounded-lg px-3 py-2 text-center"
                >
                  <div className="text-2xl mb-1">{role.emoji}</div>
                  <div className="text-amber-100 font-medium">{role.label}</div>
                  <div className="text-xs text-gray-300">{role.detail}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 投资邀请 */}
          <div className="bg-gradient-to-r from-emerald-900/90 via-teal-900/80 to-emerald-950/90 rounded-xl p-6 mb-6 backdrop-blur-sm border border-emerald-700/30">
            <h2 className="text-xl font-bold text-emerald-100 mb-2 flex items-center justify-center gap-2">
              💰 寻求合作
            </h2>
            <p className="text-emerald-50 text-center">
              欢迎投资方、发行方洽谈合作
            </p>
            <p className="text-emerald-100 text-sm text-center mt-1">
              共同打造水墨风 ARPG 力作
            </p>
          </div>

          {/* AI 知识库广告 */}
          <div className="bg-gradient-to-r from-violet-900/90 via-purple-900/80 to-violet-950/90 rounded-xl p-6 mb-6 backdrop-blur-sm border border-violet-700/30">
            <h2 className="text-xl font-bold text-violet-100 mb-3 flex items-center justify-center gap-2">
              🤖 AI 信息知识库
            </h2>
            <p className="text-violet-50 text-center mb-3">
              加入付费 AI 群，获取最新 AI 技术分享与资源
            </p>
            {images['AI信息知识库.jpg'] && (
              <div className="flex justify-center">
                <img
                  src={images['AI信息知识库.jpg']}
                  alt="AI信息知识库"
                  className="rounded-lg max-w-xs w-auto"
                  style={{ maxHeight: '200px' }}
                />
              </div>
            )}
          </div>

          {/* 联系提示 */}
          <div className="bg-gradient-to-r from-blue-900/90 via-indigo-900/80 to-blue-950/90 rounded-xl p-4 mb-6 backdrop-blur-sm border border-blue-700/30">
            <p className="text-blue-50 text-center text-sm">
              🛠️ 环境搭建与 Bug 反馈，请扫码联系下方作者
            </p>
          </div>

          {/* 卡片区 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {cards.map((card, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-md rounded-lg p-4 hover:bg-white/20 transition-all border border-white/10"
              >
                <div className="flex items-center gap-2 mb-3 text-white">
                  <card.icon className="w-5 h-5" />
                  <h3 className="font-semibold">{card.title}</h3>
                </div>
                <p className="text-sm text-gray-300 mb-3">{card.description}</p>
                {card.image ? (
                  <div className="bg-white rounded-lg p-2">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="w-full h-auto rounded"
                      style={{ maxHeight: '200px', objectFit: 'contain' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="bg-white/20 rounded-lg p-4 text-center text-gray-400 text-sm">
                    <QrCode className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    图片加载中...
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 更新日志 */}
          <div className="bg-gradient-to-r from-slate-800/90 via-gray-800/80 to-slate-900/90 rounded-xl p-6 mt-6 backdrop-blur-sm border border-slate-700/30">
            <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
              <span className="text-2xl">📝</span>
              更新日志
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              基于 <a href="https://github.com/AndyMik90/Auto-Claude.git" className="text-blue-400 hover:underline">AndyMik90/Auto-Claude</a> 的修改
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { emoji: '💻', title: '集成 VSCode 编辑器', desc: '内置 code-server，提供完整的代码编辑体验' },
                { emoji: '🎨', title: '集成 cc-wf-studio', desc: '可视化工作流编辑器，拖拽式任务编排' },
                { emoji: '📋', title: '修改看板执行逻辑', desc: '优化任务流转和状态管理机制' },
                { emoji: '🔧', title: '增加 Git 支持库', desc: '扩展 Git 操作功能，支持更多工作流' },
                { emoji: '🖼️', title: '修改界面布局', desc: '优化用户界面，提升交互体验' },
                { emoji: '🤖', title: 'AI 大模型集成', desc: '使用 AI 大模型进行更新与扩展' }
              ].map((log) => (
                <div
                  key={log.title}
                  className="bg-black/40 rounded-lg px-4 py-3 flex items-start gap-3"
                >
                  <span className="text-2xl">{log.emoji}</span>
                  <div>
                    <div className="text-white font-medium">{log.title}</div>
                    <div className="text-gray-400 text-sm">{log.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 底部信息 */}
          <div className="text-center text-gray-400 text-sm mt-6 space-y-1">
            <p>诸子百家-谁的天下</p>
            <p className="flex items-center justify-center gap-4">
              <span>竹海晨金</span>
              <span>|</span>
              <span>QQ群: 1019763815</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
