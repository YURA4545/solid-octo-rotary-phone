
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

interface QuickReplyGameProps {
  onScore: (xp: number) => void;
  onClose: () => void;
}

interface Question {
  q: string;
  options: { text: string; score: number; feedback: string }[];
}

const QuickReplyGame: React.FC<QuickReplyGameProps> = ({ onScore, onClose }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [finished, setFinished] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [customInput, setCustomInput] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  const getAi = () => {
    const key = process.env.API_KEY || "";
    if (!key) throw new Error("API_KEY_MISSING");
    return new GoogleGenAI({ apiKey: key });
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const ai = getAi();
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "Сгенерируй 3 вопроса от клиентов RBT.RU. Темы: цена, гарантия. Формат JSON.",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                q: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING },
                      score: { type: Type.NUMBER },
                      feedback: { type: Type.STRING }
                    },
                    required: ["text", "score", "feedback"]
                  }
                }
              },
              required: ["q", "options"]
            }
          }
        }
      });
      setQuestions(JSON.parse(result.text));
    } catch (e) {
      console.error("Failed to fetch questions", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (timeLeft > 0 && !finished && !lastFeedback && !loading && !isCustomMode) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !finished && !lastFeedback && !isCustomMode) {
      handleOptionSelect(-25, "Время вышло!"); 
    }
  }, [timeLeft, finished, lastFeedback, loading, isCustomMode]);

  const handleOptionSelect = (xp: number, feedback: string) => {
    setTotalScore(prev => prev + xp);
    setLastFeedback(feedback);
  };

  const handleCustomSubmit = async () => {
    if (!customInput.trim()) return;
    setLoading(true);
    try {
      const ai = getAi();
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Оцени ответ: "${customInput}" на вопрос "${questions[step].q}".`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              feedback: { type: Type.STRING }
            },
            required: ["score", "feedback"]
          }
        }
      });
      const evalData = JSON.parse(result.text);
      handleOptionSelect(evalData.score, evalData.feedback);
    } catch (e) {
      handleOptionSelect(10, "Ответ принят.");
    } finally {
      setLoading(false);
      setIsCustomMode(false);
      setCustomInput('');
    }
  };

  const nextStep = () => {
    setLastFeedback(null);
    if (step < questions.length - 1) {
      setStep(step + 1);
      setTimeLeft(15);
    } else {
      setFinished(true);
      onScore(totalScore);
    }
  };

  if (loading && questions.length === 0) {
    return <div className="p-20 text-center font-bold">Загрузка испытаний...</div>;
  }

  if (finished) {
    return (
      <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center max-w-md mx-auto mt-20">
        <h2 className="text-3xl font-black mb-8 italic text-slate-900">Итог: {totalScore} XP</h2>
        <button onClick={onClose} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-rbt-red transition-all">Вернуться</button>
      </div>
    );
  }

  return (
    <div className="bg-white p-10 md:p-14 rounded-[3.5rem] shadow-2xl w-full max-w-2xl text-left mx-auto mt-10">
      <div className="flex justify-between items-center mb-10">
        <span className="bg-rbt-red text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase">Вопрос {step + 1}</span>
        <div className="text-2xl font-black text-slate-400">00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</div>
      </div>
      <h3 className="text-2xl font-black text-slate-900 mb-10 italic">"{questions[step]?.q}"</h3>
      {!lastFeedback ? (
        <div className="space-y-4">
          {!isCustomMode ? (
            <>
              {questions[step]?.options.map((opt, i) => (
                <button key={i} onClick={() => handleOptionSelect(opt.score, opt.feedback)} className="w-full text-left p-6 rounded-2xl border-2 border-slate-100 hover:border-rbt-red font-bold text-slate-700 transition-all">
                  {opt.text}
                </button>
              ))}
              <button onClick={() => setIsCustomMode(true)} className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-black text-[10px] uppercase mt-4 hover:bg-slate-50 transition-all">
                Свой ответ
              </button>
            </>
          ) : (
            <div>
              <textarea value={customInput} onChange={(e) => setCustomInput(e.target.value)} className="w-full h-32 p-6 rounded-2xl bg-slate-50 border-2 border-slate-200 mb-4 font-bold outline-none focus:border-rbt-red transition-all" />
              <div className="flex gap-4">
                <button onClick={() => setIsCustomMode(false)} className="flex-1 py-4 font-black text-slate-400 uppercase text-xs">Отмена</button>
                <button onClick={handleCustomSubmit} className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs">Отправить</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center">
          <p className="text-lg font-black italic mb-8 p-6 bg-slate-50 rounded-2xl text-slate-700">"{lastFeedback}"</p>
          <button onClick={nextStep} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-widest hover:bg-rbt-red transition-all">Дальше</button>
        </div>
      )}
    </div>
  );
};

export default QuickReplyGame;
