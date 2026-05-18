import { createContext, useContext, useState } from "react";

const HealthContext = createContext(null);

export function HealthProvider({ children }) {
    const [meals, setMeals] = useState([]);
    const [sleep, setSleep] = useState([]);
    const [water, setWater] = useState([]);
    const [workout, setWorkout] = useState([]);
    const [heart, setHeart] = useState([]);
    const [bmi, setBmi] = useState([]);
    const [mood, setMood] = useState([]);
    const [medicine, setMedicine] = useState([]);

    return (
        <HealthContext.Provider value={{
            meals, setMeals,
            sleep, setSleep,
            water, setWater,
            workout, setWorkout,
            heart, setHeart,
            bmi, setBmi,
            mood, setMood,
            medicine, setMedicine,
        }}>
            {children}
        </HealthContext.Provider>
    );
}

export function useHealth() {
    const context = useContext(HealthContext);
    if (!context) throw new Error("useHealth must be used within HealthProvider");
    return context;
}