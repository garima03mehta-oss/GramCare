import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp
} from "firebase/firestore";
import { calculateDistance, daysUntilExpiry, calculateRedistributionScore } from "./utils/distance";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

import { signOut } from "firebase/auth";
import { db, auth } from "./firebase/config";
import { useAuth } from "./context/AuthContext";
import { useNavigate, Link } from "react-router-dom";



function Dashboard() {
  const [suggestions, setSuggestions] = useState({});

  async function fetchSuggestions(medicineName, myCenterId) {
    const myCenterDoc = await getDoc(doc(db, "centers", myCenterId));
    const myCenter = myCenterDoc.data();

    const invQuery = query(
      collection(db, "inventory"),
      where("medicineName", "==", medicineName)
    );
    const invSnapshot = await getDocs(invQuery);

    const candidates = [];

    for (const invDoc of invSnapshot.docs) {
      const data = invDoc.data();
      if (data.centerId === myCenterId) continue;
      if (data.quantity <= data.lowStockThreshold) continue;

      const centerDoc = await getDoc(doc(db, "centers", data.centerId));
      if (!centerDoc.exists()) continue;
      const centerData = centerDoc.data();

      const distance = calculateDistance(
        myCenter.latitude,
        myCenter.longitude,
        centerData.latitude,
        centerData.longitude
      );
      const daysLeft = daysUntilExpiry(data.expiryDate);
      const score = calculateRedistributionScore(distance, daysLeft);

      candidates.push({
        centerId: data.centerId,
        centerName: centerData.name,
        quantity: data.quantity,
        distance: distance.toFixed(1),
        daysLeft,
        score
      });
    }

    candidates.sort((a, b) => b.score - a.score);

    setSuggestions((prev) => ({ ...prev, [medicineName]: candidates.slice(0, 3) }));
  }
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [medicines, setMedicines] = useState([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [threshold, setThreshold] = useState("");
  const [expiry, setExpiry] = useState("");
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "inventory"),
      where("centerId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setMedicines(items);
    });

    return unsubscribe;
  }, [currentUser]);

  async function handleAddOrUpdate(e) {
    e.preventDefault();

    const medicineData = {
      centerId: currentUser.uid,
      medicineName: name,
      quantity: parseInt(quantity),
      lowStockThreshold: parseInt(threshold),
      expiryDate: expiry,
      updatedAt: new Date().toISOString()
    };

    if (editingId) {
      await updateDoc(doc(db, "inventory", editingId), medicineData);
      setEditingId(null);
    } else {
      await addDoc(collection(db, "inventory"), medicineData);
    }

    setName("");
    setQuantity("");
    setThreshold("");
    setExpiry("");
  }

  function handleEdit(medicine) {
    setEditingId(medicine.id);
    setName(medicine.medicineName);
    setQuantity(medicine.quantity);
    setThreshold(medicine.lowStockThreshold);
    setExpiry(medicine.expiryDate);
  }

  async function handleDelete(id) {
    await deleteDoc(doc(db, "inventory", id));
  }

  async function handleSendRequest(medicineName, suggestion) {
  try {
    await addDoc(collection(db, "requests"), {
      medicineName,
      fromCenterId: suggestion.centerId,
      toCenterId: currentUser.uid,
      quantity: 10, // Change if you want user-selected quantity
      status: "Pending",
      createdAt: serverTimestamp()
    });

    alert("Request sent successfully!");
  } catch (error) {
    console.error(error);
    alert("Failed to send request.");
  }
}

  async function handleLogout() {
    await signOut(auth);
    navigate("/login");
  }

  const lowStockCount = medicines.filter(
    (m) => m.quantity <= m.lowStockThreshold
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-cyan-50 to-teal-100 p-6">
      <div className="bg-gradient-to-r from-teal-600 via-cyan-500 to-blue-600 rounded-3xl shadow-xl p-6 mb-8 flex justify-between items-center">

        <div>
          <h1 className="text-4xl font-bold text-white">
            🏥 GramCare Dashboard
          </h1>
          <p className="text-cyan-100">
            Smart Medicine Distribution System
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            to="/search"
            className="bg-white text-teal-700 px-5 py-2 rounded-xl font-semibold hover:bg-gray-100"
          >
            🔍 Search
          </Link>

          <Link
            to="/requests"
            className="bg-emerald-500 text-white px-5 py-2 rounded-xl hover:bg-emerald-600"
          >
            📦 Requests
          </Link>

          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-5 py-2 rounded-xl hover:bg-red-600"
          >
            Logout
          </button>
        </div>

      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-500">
            💊 Total Medicines
          </h2>
          <p className="text-5xl font-bold text-teal-600 mt-2">
            {medicines.length}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-500">
            ⚠️ Low Stock
          </h2>
          <p className="text-5xl font-bold text-red-500 mt-2">
            {lowStockCount}
          </p>
        </div>

      </div>

      <h2 className="text-2xl font-bold text-teal-700 mb-4">
        📊 Stock Levels
      </h2>

      {medicines.length > 0 && (
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-8 max-w-3xl">
          <Bar
            data={{
              labels: medicines.map((m) => m.medicineName),
              datasets: [
                {
                  label: "Quantity",
                  data: medicines.map((m) => m.quantity),
                  backgroundColor: medicines.map((m) =>
                    m.quantity <= m.lowStockThreshold ? "red" : "green"
                  )
                }
              ]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { display: false }
              }
            }}
          />
        </div>
      )}
      <div className="bg-white rounded-3xl shadow-xl p-6 mb-8">

        <h2 className="text-2xl font-bold text-teal-700 mb-6">
          {editingId ? "✏️ Edit Medicine" : "➕ Add Medicine"}
        </h2>

        <form onSubmit={handleAddOrUpdate} className="grid gap-4">

          <input
            type="text"
            placeholder="Medicine Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
          />

          <input
            type="number"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
          />

          <input
            type="number"
            placeholder="Low Stock Threshold"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
          />

          <input
            type="date"
            placeholder="Expiry Date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
          />

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold py-3 rounded-xl hover:scale-105 transition"
          >
            {editingId ? "Update Medicine" : "Add Medicine"}
          </button>

        </form>

      </div>

      <div className="bg-white rounded-3xl shadow-xl p-6">

        <h2 className="text-2xl font-bold text-teal-700 mb-4">
          📦 Inventory
        </h2>
        <table border="1">
          <thead>
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Quantity</th>
              <th className="p-3">Threshold</th>
              <th className="p-3">Expiry</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {medicines.map((m) => (
              <tr key={m.id} className="border-b hover:bg-cyan-50 transition">
                <td className="p-3">{m.medicineName}</td>
                <td className="p-3">{m.quantity}</td>
                <td className="p-3">{m.lowStockThreshold}</td>
                <td className="p-3">{m.expiryDate}</td>
                <td className="p-3">
                  {m.quantity <= m.lowStockThreshold ? (
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                      Low Stock
                    </span>
                  ) : (
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm">
                      In Stock
                    </span>
                  )}

                  {m.quantity <= m.lowStockThreshold && (
                    <button
                      onClick={() => fetchSuggestions(m.medicineName, currentUser.uid)}
                      className="mt-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm transition"
                    >
                      Show Suggestions
                    </button>
                  )}
                </td><td className="space-x-2">
                  <button
                    onClick={() => handleEdit(m)}
                    className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(m.id)}
                    className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {Object.keys(suggestions).map((medName) => (
          <div
            key={medName}
            className="bg-white rounded-3xl shadow-xl p-6 mt-8"
          >
            <h3 className="text-xl font-bold text-teal-700 mb-4">
              💡 Suggestions for {medName}
            </h3>
            {suggestions[medName].length === 0 ? (
              <p>No surplus found at other centers.</p>
            ) : (
              <div className="space-y-4">
  {suggestions[medName].map((s, idx) => (
    <div
      key={idx}
      className="border rounded-xl p-4 flex justify-between items-center"
    >
      <div>
        <p><b>Center:</b> {s.centerName}</p>
        <p><b>Distance:</b> {s.distance} km</p>
        <p><b>Quantity:</b> {s.quantity}</p>
        <p><b>Expiry:</b> {s.daysLeft} days</p>
      </div>

      <button
        onClick={() => handleSendRequest(medName, s)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg"
      >
        📩 Request
      </button>
    </div>
  ))}
</div>
            )}
          </div>
        ))}

      </div>

    </div>

  );
}


export default Dashboard;
