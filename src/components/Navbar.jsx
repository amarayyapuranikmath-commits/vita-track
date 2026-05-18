import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="relative bg-[#0E0E0E] text-white">
            <div className="max-w-7xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="z-50">
                    <h1 
                        className="text-3xl md:text-4xl font-black text-orange-500 cursor-pointer tracking-tight"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                        VitaTrack
                    </h1>
                </Link>

                {/* Desktop Menu */}
                <div className="hidden lg:flex gap-8 items-center text-sm font-medium text-[#FDFBF7]/70">
                    <button className="hover:text-orange-500 transition-colors">Home</button>
                    <button className="hover:text-orange-500 transition-colors">About</button>
                    <button className="hover:text-orange-500 transition-colors">Features</button>
                    <button className="hover:text-orange-500 transition-colors">Health</button>
                    <button className="hover:text-orange-500 transition-colors">Contact</button>
                </div>

                {/* Desktop Buttons */}
                <div className="hidden lg:flex gap-4">
                    <Link to="/login">
                        <button className="px-6 py-2.5 border border-[#FDFBF7]/15 rounded-full text-[#FDFBF7] hover:bg-white/5 transition-all text-sm font-medium">
                            Login
                        </button>
                    </Link>
                    <Link to="/signup">
                        <button className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-full text-white transition-all text-sm font-medium shadow-md">
                            Join Free
                        </button>
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="lg:hidden p-2 rounded-xl text-[#FDFBF7] hover:bg-white/5 transition z-50"
                >
                    {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 bg-[#161616] border-b border-white/5 py-6 px-8 flex flex-col gap-5 z-40 shadow-2xl lg:hidden">
                    <div className="flex flex-col gap-4 text-sm font-medium text-[#FDFBF7]/70">
                        <button onClick={() => setIsOpen(false)} className="text-left py-2 border-b border-white/5 hover:text-orange-500">Home</button>
                        <button onClick={() => setIsOpen(false)} className="text-left py-2 border-b border-white/5 hover:text-orange-500">About</button>
                        <button onClick={() => setIsOpen(false)} className="text-left py-2 border-b border-white/5 hover:text-orange-500">Features</button>
                        <button onClick={() => setIsOpen(false)} className="text-left py-2 border-b border-white/5 hover:text-orange-500">Health</button>
                        <button onClick={() => setIsOpen(false)} className="text-left py-2 border-b border-white/5 hover:text-orange-500">Contact</button>
                    </div>

                    <div className="flex flex-col gap-3 mt-2">
                        <Link to="/login" onClick={() => setIsOpen(false)}>
                            <button className="w-full py-3 border border-[#FDFBF7]/15 rounded-full text-[#FDFBF7] text-center font-medium text-sm">
                                Login
                            </button>
                        </Link>
                        <Link to="/signup" onClick={() => setIsOpen(false)}>
                            <button className="w-full py-3 bg-orange-500 rounded-full text-white text-center font-medium text-sm">
                                Join Free
                            </button>
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}