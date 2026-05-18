import { createContext, useContext, useState } from "react";

const AIContext = createContext(null);

export function AIProvider({ children }) {
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content: "Hi! I'm VitaAI, your personal health coach. How can I help you today?",
        },
    ]);
    const [isTyping, setIsTyping] = useState(false);

    const sendMessage = async (text) => {
        const userMsg = { role: "user", content: text };
        setMessages((prev) => [...prev, userMsg]);
        setIsTyping(true);

        // Placeholder — will connect to real AI API in Phase 14
        setTimeout(() => {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "I'm analyzing your health data. This feature will be fully connected in the backend phase!" },
            ]);
            setIsTyping(false);
        }, 1500);
    };

    return (
        <AIContext.Provider value={{ messages, isTyping, sendMessage }}>
            {children}
        </AIContext.Provider>
    );
}

export function useAI() {
    const context = useContext(AIContext);
    if (!context) throw new Error("useAI must be used within AIProvider");
    return context;
}