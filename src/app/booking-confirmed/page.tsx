import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function BookingConfirmedPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#faf9f6] flex items-center justify-center px-6 pt-20">
        <div className="max-w-md text-center">
          {/* Checkmark */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-8 shadow-lg"
            style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
          >
            ✓
          </div>

          <h1
            className="text-4xl text-[#1a1a2e] mb-4"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
          >
            You&apos;re booked!
          </h1>

          <p className="text-[#6b7280] text-base leading-relaxed mb-8">
            Your session is confirmed. You&apos;ll receive a confirmation email
            shortly. I look forward to meeting you and exploring this work
            together.
          </p>

          <div className="p-5 rounded-2xl bg-[#0d7377]/6 border border-[#0d7377]/15 mb-8 text-left">
            <p className="text-sm font-medium text-[#0d7377] mb-1">What&apos;s next?</p>
            <ul className="text-sm text-[#6b7280] space-y-1">
              <li>✉️ Check your inbox for a confirmation email</li>
              <li>📅 Add the session to your calendar</li>
              <li>📝 A brief intake questionnaire will be sent to you</li>
            </ul>
          </div>

          <Link
            href="/"
            className="inline-block px-8 py-3 rounded-full text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
          >
            Back to Home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
