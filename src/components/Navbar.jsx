import { Link } from "react-router-dom";

export default function Navbar() {
    return (
        <nav className="flex items-center justify-between px-10 py-6">

            {/* Logo */}
            <Link to="/">
                <h1 className="text-4xl font-bold text-orange-500 cursor-pointer">
                    VitaTrack
                </h1>
            </Link>

            {/* Menu */}
            <div className="flex gap-10 text-white">
                <button>Home</button>
                <button>About</button>
                <button>Features</button>
                <button>Health</button>
                <button>Contact</button>
            </div>

            {/* Buttons */}
            <div className="flex gap-4">

                <Link to="/login">
                    <button className="px-8 py-3 border border-gray-700 rounded-full text-white">
                        Login
                    </button>
                </Link>

                <Link to="/signup">
                    <button className="px-8 py-3 bg-orange-500 rounded-full text-white">
                        Join Free
                    </button>
                </Link>

            </div>
        </nav>
    );
}