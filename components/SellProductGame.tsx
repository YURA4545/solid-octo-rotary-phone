
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

interface SellProductGameProps {
  onScore: (xp: number) => void;
  onClose: () => void;
}

interface Step {
  client: string;
  options: { text: string; score: number; feedback: string }[];
}

const SellProductGame: React.FC<SellProductGameProps> = ({ onScore, onClose }) => {
  const [step, setStep] = useState(0);
  const [scenario, setScenario] = useState<{ product: string; steps: Step[] } | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  const getAi = () => {
    const key = (window as any).process?.env?.API_KEY || "";
    return new GoogleGenAI({ apiKey: key });
  };

  const generateScenario = async () => {
    setLoading(true);
    try {
      const ai = getAi();
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "Создай сценарий продажи в RBT.RU. 3 шага. Формат JSON.",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              product: { type: Type.STRING },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    client: { type: Type.STRING },
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
                  required: ["client", "options"]
                }
              }
            },
            required: ["product", "steps"]
          }
        }
      });
      setScenario(JSON.parse(result.text));
    } catch (e) {
      console.error("Failed to generate scenario", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateScenario();
  }, []);

  const handleOption = (score: number) => {
    const newTotal = totalScore + score;
    setTotalScore(newTotal);
    if (scenario && step < scenario.steps.length - 1) {
      setStep(step + 1);
    } else {
      setFinished(true);
      onScore(newTotal);
    }
  };

  if (loading) return <div className="p-20 text-center font-bold">Генерация сценария...</div>;

  if (finished) {
    return (
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl text-center max-w-xl">
        <h2 className="text-3xl font-black mb-8 italic">Итог: {totalScore} XP</h2>
        <button onClick={onClose} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black">В меню</button>
      </div>
    );
  }

  return (
    <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl w-full max-w-2xl text-left">
      <h3 className="font-black text-slate-900 italic uppercase mb-10 tracking-tighter">Сценарий: {scenario?.product}</h3>
      <div className="bg-slate-50 p-8 rounded-3xl mb-10 border border-slate-100 italic font-bold">
        "{scenario?.steps[step].client}"
      </div>
      <div className="space-y-4">
        {scenario?.steps[step].options.map((opt, i) => (
          <button key={i} onClick={() => handleOption(opt.score)} className="w-full text-left p-6 rounded-[2rem] border-2 hover:border-rbt-red font-bold text-slate-800">
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SellProductGame;
