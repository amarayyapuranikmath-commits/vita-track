import { Heart } from "lucide-react";

const footerLinks = {
    Product: ["Dashboard", "Tracking", "Insights"],
    Company: ["About", "Contact", "Support"],
    Legal: ["Privacy", "Terms"],
};

export default function Footer() {
    return (
        <footer className="bg-black text-white px-6 py-16">

            <div className="grid md:grid-cols-4 gap-10">

                {/* Logo */}
                <div>
                    <h1 className="text-2xl font-bold text-orange">
                        VitaTrack
                    </h1>

                    <p className="mt-4 text-sm text-gray-400">
                        Be Fit. Stay Strong. Live Smarter.
                    </p>
                </div>

                {/* Links */}
                {Object.entries(footerLinks).map(
                    ([category, links]) => (
                        <div key={category}>

                            <h3 className="font-bold mb-4">
                                {category}
                            </h3>

                            <ul className="space-y-2">

                                {links.map((link) => (
                                    <li key={link}>
                                        <a
                                            href="#"
                                            className="text-gray-400 hover:text-orange"
                                        >
                                            {link}
                                        </a>
                                    </li>
                                ))}

                            </ul>

                        </div>
                    )
                )}

            </div>

            {/* Bottom */}
            <div className="border-t border-gray-800 mt-12 pt-8 flex justify-between">

                <p className="text-sm text-gray-400">
                    © {new Date().getFullYear()} VitaTrack
                </p>

                <p className="flex items-center gap-2 text-sm text-gray-400">
                    Made with <Heart size={14} /> for healthy lives
                </p>

            </div>

        </footer>
    );
}