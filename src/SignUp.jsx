import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase/config";
import { useNavigate, Link } from "react-router-dom";

function Signup() {
  const [centerName, setCenterName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "centers", user.uid), {
        name: centerName,
        email: email,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        createdAt: new Date().toISOString()
      });

      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  }
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
      },
      () => {
        alert("Unable to fetch your location.");
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-700 flex items-center justify-center p-6">

      <div className="absolute inset-0 bg-black/20"></div>

      <div className="relative bg-white/20 backdrop-blur-lg border border-white/30 rounded-3xl shadow-2xl w-full max-w-md p-8">

        <div className="text-center mb-8">
          <div className="text-6xl mb-3">📝</div>

          <h1 className="text-4xl font-bold text-white">
            Gram Care
          </h1>

          <p className="text-white/90 mt-2">
            Register Your Healthcare Center
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">

          <input
            type="text"
            placeholder="Healthcare Center Name"
            value={centerName}
            onChange={(e) => setCenterName(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-white/40 bg-white/30 text-white placeholder-white outline-none focus:ring-2 focus:ring-white"
          />

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
          <button
            type="button"
            onClick={getCurrentLocation}
            className="w-full bg-cyan-500 text-white py-2 rounded-xl hover:bg-cyan-600 transition-all duration-300"
          >
            📍 Use Current Location
          </button>
          <input
            type="text"
            placeholder="Latitude"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-white/40 bg-white/30 text-white placeholder-white outline-none focus:ring-2 focus:ring-white"
          />

          <input
            type="text"
            placeholder="Longitude"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
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
            Create Account
          </button>

        </form>

        <p className="text-center text-white mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold underline"
          >
            Login
          </Link>
        </p>

      </div>
    </div>
  );
}

export default Signup;