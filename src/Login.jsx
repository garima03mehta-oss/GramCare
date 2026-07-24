import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase/config";
import { useNavigate, Link } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError("Invalid email or password");
    }
  }

  return (
  <div className="min-h-screen bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-700 flex items-center justify-center p-6">

    <div className="absolute inset-0 bg-black/20"></div>

    <div className="relative bg-white/20 backdrop-blur-lg border border-white/30 rounded-3xl shadow-2xl w-full max-w-md p-8">

      <div className="text-center mb-8">
        <div className="text-6xl mb-3">🏥</div>

        <h1 className="text-4xl font-bold text-white">
          Gram Care
        </h1>

        <p className="text-white/90 mt-2">
          Smart Medicine Distribution System
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl border border-white/40 bg-white/30 text-white placeholder-white outline-none focus:ring-2 focus:ring-white"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl border border-white/40 bg-white/30 text-white placeholder-white outline-none focus:ring-2 focus:ring-white"
        />

        {error && (
          <p className="text-red-200 text-sm">{error}</p>
        )}

        <button
          type="submit"
          className="w-full bg-white text-teal-700 font-bold py-3 rounded-xl hover:bg-gray-100 hover:scale-105 transition-all duration-300"
        >
          Login
        </button>

      </form>

      <p className="text-center text-white mt-6">
        New here?{" "}
        <Link
          to="/signup"
          className="font-semibold underline"
        >
          Register
        </Link>
      </p>

    </div>
  </div>
);
}

export default Login;