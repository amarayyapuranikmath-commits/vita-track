import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Testimonials from "../components/Testimonials";
import Footer from "../components/Footer";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#0E0E0E] text-white">

            <Navbar />

            <Hero />

            <Features />

            <Testimonials />

            <Footer />

        </div>
    );
}