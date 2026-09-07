import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { Send, Sparkles, MessageCircle, Info, Image as ImageIcon, X, Upload } from "lucide-react";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imagePreview?: string;
}

export const AIChat: React.FC = () => {
  const { profile, positions, strategies, addToast } = useApp();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "반갑습니다! AISTOCK 24 수석 인공지능 투자 매니저이자 비서입니다. \n\n연동하신 실계좌 포트폴리오의 매매 이유, 차트/매매전략 이미지 OCR 정밀 분석, 국내외 주식 및 비트코인 실시간 지표 분석에 관해 무엇이든 물어보세요! \n\n📸 차트나 매매전략 캡처 이미지를 하단 카메라 버튼으로 첨부하시면 자비스 Vision AI가 정밀 분석해 드립니다."
    }
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{
    file: File;
    previewUrl: string;
    base64: string;
    mimeType: string;
  } | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scrollBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollBottom();
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('이미지 파일(PNG, JPG, WEBP 등)만 업로드 가능합니다.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      setAttachedImage({
        file,
        previewUrl: URL.createObjectURL(file),
        base64: base64String,
        mimeType: file.type || 'image/png'
      });
      addToast('📸 차트/매매전략 이미지가 첨부되었습니다. 분석 질문을 전송하세요!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (text: string) => {
    if ((!text.trim() && !attachedImage) || sending) return;
    
    const userMsg = text.trim() || (attachedImage ? "업로드한 이미지(차트/매매전략)를 자비스 퀀트 비전 엔진으로 정밀 분석해줘." : "");
    const currentImage = attachedImage;

    setInput("");
    setAttachedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    setMessages(prev => [...prev, { 
      role: "user", 
      content: userMsg,
      imagePreview: currentImage?.previewUrl
    }]);
    setSending(true);

    // Context preparation
    const stockSummary = positions.map(p => `${p.name}(${p.symbol}) ${p.quantity}주`).join(", ") || "없음";
    const stratSummary = strategies.map(s => `${s.name}(${s.isActive ? '가동' : '중지'})`).join(", ") || "없음";
    const portfolioCtx = {
      totalAsset: profile ? (profile.balance + positions.reduce((s, p) => s + (p.quantity * p.currentPrice), 0)).toLocaleString() : "0",
      cash: profile ? (profile.balance ?? 0).toLocaleString() : "0",
      stockValue: profile ? positions.reduce((s, p) => s + (p.quantity * p.currentPrice), 0).toLocaleString() : "0",
      tradingMode: profile ? profile.tradingMode : "approval",
      activeStrategy: stratSummary
    };

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: messages.slice(-5), // pass last 5 turns of conversation context
          portfolio: portfolioCtx,
          imageAttachment: currentImage ? {
            mimeType: currentImage.mimeType,
            data: currentImage.base64
          } : undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "죄송합니다. 서버가 혼잡하여 답변을 실시간으로 가져올 수 없습니다. 잠시 후 다시 시도해 주세요." }]);
      }
    } catch (e: any) {
      console.error(e);
      setMessages(prev => [...prev, { role: "assistant", content: "AI 응답을 수신하는 도중 일시적인 네트워크 지연이 발생했습니다: " + e.message }]);
    } finally {
      setSending(false);
    }
  };

  const presetQuestions = [
    "📸 30 EMA + 수평 지지/저항선 단타 기법 정밀 분석",
    "오늘 삼성전자를 매수한 근거를 요약해줘",
    "포트폴리오의 안정형 자산 배분 전략 추천해줘",
    "자동매매 하루 손실 제한 한도는 어떻게 작동해?"
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[580px]">
      {/* Messages Chat Area */}
      <div className="bg-white border border-zinc-200 rounded-lg lg:col-span-2 flex flex-col justify-between overflow-hidden h-full shadow-sm">
        <div className="border-b border-zinc-100 p-4 bg-white flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
            <MessageCircle className="h-4.5 w-4.5 text-zinc-600" />
            <span>AI 투자 수석 비서 커뮤니케이터 (AIChat)</span>
          </h3>
          <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>VISION AI ONLINE</span>
          </span>
        </div>

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 max-w-[88%] ${
                m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              <div className={`h-7 w-7 rounded-full flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                m.role === 'user' ? "bg-zinc-800 text-white" : "bg-white border border-zinc-200 text-zinc-900"
              }`}>
                {m.role === 'user' ? "ME" : "AI"}
              </div>
              <div className={`text-xs p-3.5 rounded-lg leading-relaxed whitespace-pre-line shadow-sm border ${
                m.role === 'user' 
                  ? "bg-zinc-950 text-white border-zinc-900" 
                  : "bg-white text-zinc-800 border-zinc-150"
              }`}>
                {m.imagePreview && (
                  <div className="mb-2.5 rounded-lg overflow-hidden border border-zinc-700 bg-black/40">
                    <img 
                      src={m.imagePreview} 
                      alt="Uploaded Chart" 
                      className="max-h-48 object-contain w-full rounded" 
                    />
                    <div className="p-1 bg-zinc-900/80 text-[10px] text-zinc-300 text-center font-mono">
                      📸 업로드된 차트/매매기법 이미지
                    </div>
                  </div>
                )}
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex items-start gap-2.5 max-w-[80%] mr-auto animate-pulse">
              <div className="h-7 w-7 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                ...
              </div>
              <div className="text-xs p-3.5 rounded-lg bg-white border border-zinc-150 text-zinc-400">
                AI 비서가 이미지 OCR 비전 모델 및 퀀트 파동 분석 알고리즘을 연산 중입니다...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Attached Image Preview Bar */}
        {attachedImage && (
          <div className="px-4 py-2 bg-zinc-100 border-t border-zinc-200 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <img src={attachedImage.previewUrl} alt="Preview" className="h-10 w-10 object-cover rounded border border-zinc-300 shrink-0" />
              <div className="text-xs truncate">
                <p className="font-semibold text-zinc-800 truncate">{attachedImage.file.name}</p>
                <p className="text-[10px] text-zinc-500">{(attachedImage.file.size / 1024).toFixed(1)} KB • 📸 OCR 분석 준비 완료</p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setAttachedImage(null)}
              className="p-1 text-zinc-400 hover:text-zinc-700 rounded-full hover:bg-zinc-200 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Input Text Form */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }} 
          className="p-3 border-t border-zinc-100 bg-white flex gap-2 items-center"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            title="차트/매매전략 이미지 첨부"
            className="p-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg transition shrink-0 cursor-pointer flex items-center gap-1 text-xs font-medium"
          >
            <ImageIcon className="h-4 w-4 text-zinc-600" />
            <span className="hidden sm:inline text-[11px]">이미지</span>
          </button>

          <input
            type="text"
            placeholder={attachedImage ? "첨부된 이미지에 대해 궁금한 점을 물어보세요..." : "AI에게 질문하거나 차트 이미지를 첨부하세요..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 font-sans"
          />
          
          <button
            type="submit"
            disabled={sending || (!input.trim() && !attachedImage)}
            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-100 text-white disabled:text-zinc-400 rounded-lg transition shrink-0 cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Preset Guides Sidebar */}
      <div className="bg-white border border-zinc-200 p-5 rounded-lg lg:col-span-1 flex flex-col justify-between h-full overflow-hidden shadow-sm">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-3 flex items-center gap-1.5">
            <Sparkles className="h-4.5 w-4.5 text-zinc-600" />
            <span>추천 질문 & Vision 분석</span>
          </h3>
          <p className="text-[11px] text-zinc-400 leading-normal">
            클릭 한 번으로 AI 분석 엔진에 실시간 해석 또는 30 EMA 차트 기법 분석을 의뢰할 수 있습니다.
          </p>

          <div className="space-y-2">
            {presetQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(q)}
                disabled={sending}
                className="w-full text-left p-3 border border-zinc-150 rounded bg-zinc-50 hover:bg-zinc-100 transition text-xs font-medium text-zinc-700 cursor-pointer font-sans"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-zinc-50 border border-zinc-150 p-3.5 rounded text-[11px] text-zinc-500 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-zinc-800">
            <Info className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            <span>Vision OCR 분석 안내</span>
          </div>
          <p className="leading-relaxed">
            차트 이미지, 매매 전략 캡처, 호가창을 업로드하시면 J.A.R.V.I.S Vision AI가 30 EMA, 수평 지지/저항선, 골든크로스 타점을 정밀 추출하여 승률을 진단해 드립니다.
          </p>
        </div>
      </div>
    </div>
  );
};
