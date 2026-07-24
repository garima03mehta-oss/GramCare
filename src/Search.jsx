import { useState } from "react";
import { collection, query, where, getDocs, doc, getDoc, addDoc } from "firebase/firestore";
import { db } from "./firebase/config";
import { useAuth } from "./context/AuthContext";
import { Link } from "react-router-dom";

function Search() {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [requestedIds, setRequestedIds] = useState([]);

  async function handleSearch(e) {
    e.preventDefault();
    setHasSearched(true);

    const q = query(
      collection(db, "inventory"),
      where("medicineName", "==", searchTerm)
    );

    const snapshot = await getDocs(q);
    const items = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const centerDoc = await getDoc(doc(db, "centers", data.centerId));
      const centerData = centerDoc.exists() ? centerDoc.data() : null;

      items.push({
        id: docSnap.id,
        ...data,
        centerName: centerData ? centerData.name : "Unknown Center",
        isOwnCenter: data.centerId === currentUser.uid
      });
    }

    setResults(items);
  }

  async function handleRequest(item) {
    const quantityStr = prompt(`How many units of ${item.medicineName} do you want to request?`);
    if (!quantityStr) return;

    const quantity = parseInt(quantityStr);
    if (isNaN(quantity) || quantity <= 0) {
      alert("Please enter a valid quantity");
      return;
    }

    await addDoc(collection(db, "requests"), {
      requestingCenterId: currentUser.uid,
      fulfillingCenterId: item.centerId,
      medicineName: item.medicineName,
      quantityRequested: quantity,
      status: "pending",
      createdAt: new Date().toISOString()
    });

    setRequestedIds([...requestedIds, item.id]);
    alert("Request sent successfully!");
  }
    return(
  <div className="min-h-screen bg-gradient-to-br from-slate-100 via-cyan-50 to-teal-100 p-6">
    <div className="bg-gradient-to-r from-teal-600 via-cyan-500 to-blue-600 rounded-3xl shadow-xl p-6 mb-8 flex justify-between items-center">

      <div>
        <h1 className="text-4xl font-bold text-white">
          🔍 Medicine Search
        </h1>

        <p className="text-cyan-100 mt-2">
          Search medicines across all healthcare centers.
        </p>
      </div>

      <Link
        to="/dashboard"
        className="bg-white text-teal-700 px-5 py-3 rounded-xl font-semibold hover:bg-gray-100"
      >
        ← Dashboard
      </Link>

    </div>
    <form
      onSubmit={handleSearch}
      className="bg-white rounded-3xl shadow-xl p-6 mb-8 flex gap-4"
    >
      <input
        type="text"
        placeholder="Search medicine (e.g. Paracetamol)"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        required
        className="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      <button
        type="submit"
        className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-8 rounded-xl font-semibold hover:scale-105 transition"
      >
        Search
      </button>
    </form>

    {hasSearched && results.length === 0 && <p>No results found.</p>}

    <table className="w-full bg-white rounded-3xl shadow-xl overflow-hidden">
      <thead className="bg-teal-600 text-white">
        <tr>
          <th className="p-3">Center</th>
          <th className="p-3">Quantity</th>
          <th className="p-3">Status</th>
          <th className="p-3">Action</th>
        </tr>
      </thead>
      <tbody>
        {results.map((item) => (
          <tr key={item.id} className="border-b hover:bg-cyan-50 transition">
            <td>{item.centerName}{item.isOwnCenter ? " (You)" : ""}</td>
            <td>{item.quantity}</td>
            <td className="p-3">
              {item.quantity === 0 ? (
                <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                  Out of Stock
                </span>
              ) : item.quantity <= item.lowStockThreshold ? (
                <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm">
                  Low Stock
                </span>
              ) : (
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm">
                  In Stock
                </span>
              )}
            </td>
            <td>
              {!item.isOwnCenter && item.quantity > 0 && (
                requestedIds.includes(item.id) ? (
                  <span>Requested</span>
                ) : (
                  <button onClick={() => handleRequest(item)}>Request</button>
                )
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
    );

}

export default Search;