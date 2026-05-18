const testimonials = [
    {
        name: "Priya Sharma",
        role: "Software Engineer, Bangalore",
        quote:
            "VitaTrack's AI meal logging is mind-blowing. I take a photo, it identifies everything, breaks down macros, and even suggests improvements. My nutrition has never been this dialled in.",
        avatar: "PS",
        color: "from-orange/30 to-orange-burnt/10",
        rating: 5,
    },
    {
        name: "Marcus Johnson",
        role: "Product Manager, London",
        quote:
            "I've tried every health app out there. VitaTrack is the first one that actually connects the dots — my sleep data influences my workout recommendations. It's like having a personal health coach.",
        avatar: "MJ",
        color: "from-indigo-500/20 to-indigo-900/5",
        rating: 5,
    },
    {
        name: "Aisha Nwosu",
        role: "Nurse Practitioner, Lagos",
        quote:
            "As a healthcare professional, I recommend VitaTrack to my patients. The heart rate monitoring and mood tracking features provide genuinely useful health insights. The data accuracy is impressive.",
        avatar: "AN",
        color: "from-rose-500/20 to-rose-900/5",
        rating: 5,
    },
    {
        name: "Liam Chen",
        role: "Entrepreneur, Singapore",
        quote:
            "Lost 14kg in 4 months using VitaTrack's integrated approach — meal tracking, hydration reminders, and sleep analysis all working together. Completely free too. Unbelievable value.",
        avatar: "LC",
        color: "from-emerald-500/20 to-emerald-900/5",
        rating: 5,
    },
    {
        name: "Sofia Martínez",
        role: "Teacher, Madrid",
        quote:
            "The mood tracking feature helped me discover that my low energy days were directly tied to poor sleep and dehydration. Simple insight, life-changing outcome. I feel in control of my health now.",
        avatar: "SM",
        color: "from-purple-500/20 to-purple-900/5",
        rating: 5,
    },
    {
        name: "Daniel Park",
        role: "Designer, Seoul",
        quote:
            "Clean, minimal, and incredibly powerful. VitaTrack doesn't feel like a health app — it feels like luxury software. The AI health score keeps me motivated without feeling judged.",
        avatar: "DP",
        color: "from-amber-500/20 to-amber-900/5",
        rating: 5,
    },
];

export default function Testimonials() {
    return (
        <section id="about" className="py-24 relative overflow-hidden">
            {/* Glow */}
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-16">
                    <span className="inline-block text-xs font-semibold tracking-widest uppercase text-orange/80 mb-4">
                        Real Stories
                    </span>
                    <h2 className="font-display font-black text-4xl md:text-5xl text-cream leading-tight">
                        People Are{" "}
                        <span className="gradient-text">Transforming</span>
                    </h2>
                    <p className="text-cream/45 font-body text-base mt-4 max-w-md mx-auto">
                        Thousands of users making smarter health decisions every day.
                    </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {testimonials.map((t, i) => (
                        <div
                            key={t.name}
                            className={`glass rounded-2xl p-6 bg-gradient-to-br ${t.color} border border-white/5 hover:border-white/10 hover:scale-[1.02] transition-all duration-300`}
                        >
                            {/* Stars */}
                            <div className="flex gap-1 mb-4">
                                {[...Array(t.rating)].map((_, j) => (
                                    <span key={j} className="text-orange text-sm">★</span>
                                ))}
                            </div>

                            <blockquote className="text-cream/70 text-sm font-body leading-relaxed mb-6">
                                "{t.quote}"
                            </blockquote>

                            <div className="flex items-center gap-3 pt-4 border-t border-white/8">
                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange to-orange-burnt flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {t.avatar}
                                </div>
                                <div>
                                    <p className="text-cream font-semibold text-sm">{t.name}</p>
                                    <p className="text-cream/40 text-xs">{t.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}