import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword, resetPassword } from "./authApi/authApi";

const ForgotResetPassword = () => {
    const [step, setStep] = useState<"forgot" | "reset">("forgot");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const navigate = useNavigate();

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await forgotPassword({ email });
            setMessage(res.message);
            setStep("reset");
        } catch (err: any) {
            setMessage(err.message || "Failed to send OTP.");
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setMessage("Passwords do not match.");
            return;
        }

        try {
            const res = await resetPassword({ email, otp, newPassword });
            setMessage(res.message);
            alert("Password reset successful! Redirecting to login...");
            navigate("/login");
        } catch (err: any) {
            setMessage(err.message || "Failed to reset password.");
        }
    };

    return (
        <div className="max-w-md mx-auto my-20 p-6 border rounded-lg shadow bg-white">
            <h2 className="text-2xl font-bold mb-4 text-center">
                {step === "forgot" ? "Forgot Password" : "Reset Password"}
            </h2>

            {step === "forgot" && (
                <form onSubmit={handleForgotPassword}>
                    <input
                        type="email"
                        placeholder="Enter your email"
                        className="w-full border p-2 rounded mb-4"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <button type="submit" className="w-full bg-primary text-white py-2 rounded">
                        Send OTP
                    </button>
                </form>
            )}

            {step === "reset" && (
                <form onSubmit={handleResetPassword}>
                    <input
                        type="text"
                        placeholder="Enter OTP"
                        className="w-full border p-2 rounded mb-3"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="New password"
                        className="w-full border p-2 rounded mb-3"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Confirm password"
                        className="w-full border p-2 rounded mb-3"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                    <button type="submit" className="w-full bg-primary text-white py-2 rounded">
                        Reset Password
                    </button>
                </form>
            )}

            {message && <p className="mt-4 text-sm text-red-600 text-center">{message}</p>}
        </div>
    );
};

export default ForgotResetPassword;
