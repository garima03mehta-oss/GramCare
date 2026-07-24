import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  addDoc,
  getDoc,
  getDocs
} from "firebase/firestore";
import { db } from "./firebase/config";
import { useAuth } from "./context/AuthContext";
import { Link } from "react-router-dom";

function Requests() {
  const { currentUser } = useAuth();
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [centerNames, setCenterNames] = useState({});

  useEffect(() => {
    if (!currentUser) return;

    const incomingQuery = query(
      collection(db, "requests"),
      where("fulfillingCenterId", "==", currentUser.uid)
    );
    const outgoingQuery = query(
      collection(db, "requests"),
      where("requestingCenterId", "==", currentUser.uid)
    );

    const unsubIncoming = onSnapshot(incomingQuery, (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setIncoming(items);
      fetchCenterNames(items, "requestingCenterId");
    });

    const unsubOutgoing = onSnapshot(outgoingQuery, (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setOutgoing(items);
      fetchCenterNames(items, "fulfillingCenterId");
    });

    return () => {
      unsubIncoming();
      unsubOutgoing();
    };
  }, [currentUser]);

  async function fetchCenterNames(items, fieldName) {
    const newNames = { ...centerNames };
    for (const item of items) {
      const id = item[fieldName];
      if (!newNames[id]) {
        const centerDoc = await getDoc(doc(db, "centers", id));
        newNames[id] = centerDoc.exists() ? centerDoc.data().name : "Unknown";
      }
    }
    setCenterNames(newNames);
  }

  async function handleApprove(request) {
    const invQuery = query(
  collection(db, "inventory"),
  where("centerId", "==", request.fulfillingCenterId),
  where("medicineName", "==", request.medicineName)
);

const invSnapshot = await getDocs(invQuery);

if (invSnapshot.empty) {
  alert("Medicine not found in inventory!");
  return;
}

const stock = invSnapshot.docs[0].data().quantity;

if (request.quantityRequested > stock) {
  alert("Not enough stock available!");
  return;
}
  const deliveryRef = await addDoc(collection(db, "deliveries"), {
    requestId: request.id,
    fromCenterId: request.fulfillingCenterId,
    toCenterId: request.requestingCenterId,
    medicineName: request.medicineName,
    quantity: request.quantityRequested,
    status: "in_transit",
    createdAt: new Date().toISOString()
  });

  await updateDoc(doc(db, "requests", request.id), {
    status: "approved",
    deliveryId: deliveryRef.id
  });

  alert("Request approved and delivery created!");
}

  async function handleReject(requestId) {
    await updateDoc(doc(db, "requests", requestId), { status: "rejected" });
  }

  return (
   <div className="min-h-screen bg-gradient-to-br from-slate-100 via-cyan-50 to-teal-100 p-6"> 
     <div className="bg-gradient-to-r from-teal-600 via-cyan-500 to-blue-600 rounded-3xl shadow-xl p-6 mb-8 flex justify-between items-center"> 
    <div>
    <h1 className="text-4xl font-bold text-white">
      📦 Medicine Requests
    </h1>

    <p className="text-cyan-100 mt-2">
      Manage incoming and outgoing medicine requests.
    </p>
  </div>

  <Link
    to="/dashboard"
    className="bg-white text-teal-700 px-5 py-3 rounded-xl font-semibold hover:bg-gray-100 transition"
  >
    ← Dashboard
  </Link>

</div>

     <h2 className="text-2xl font-bold text-teal-700 mb-4">
  📥 Incoming Requests
</h2>
     <div className="bg-white rounded-3xl shadow-xl p-6 mb-8 overflow-x-auto">

<table className="w-full">
        <thead>
          <tr>
            <th className="p-3 text-left">Requesting Center</th>
<th className="p-3 text-left">Medicine</th>
<th className="p-3 text-left">Quantity</th>
<th className="p-3 text-left">Status</th>
<th className="p-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
  {incoming.map((r) => (
    <tr key={r.id} className="border-b hover:bg-cyan-50 transition">
      <td classname="p-3">{centerNames[r.requestingCenterId] || "Loading..."}</td>
      <td classname="p-3">{r.medicineName}</td>
      <td classname="p-3">{r.quantityRequested}</td>
      <td classname="p-3">{r.status}</td>
      <td classname="p-3">
        {r.status === "pending" && (
          <>
           <button
  onClick={() => handleApprove(r)}
  className="bg-green-500 text-white px-4 py-2 rounded-lg mr-2 hover:bg-green-600"
>
  Approve
</button>

<button
  onClick={() => handleReject(r.id)}
  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
>
  Reject
</button>
          </>
        )}
        {r.status === "approved" && (
          <Link to={`/delivery/${r.deliveryId || ""}`}>View Delivery</Link>
        )}
      </td>
    </tr>
  ))}
</tbody>
      </table>
      </div>
      

     <h2 className="text-2xl font-bold text-teal-700 mb-4 mt-8">
  📤 Outgoing Requests
</h2>
     <div className="bg-white rounded-3xl shadow-xl p-6 mb-8 overflow-x-auto">

<table className="w-full">
        <thead>
          <tr>
            <th className="p-3 text-left">Fulfilling Center</th>
<th className="p-3 text-left">Medicine</th>
<th className="p-3 text-left">Quantity</th>
<th className="p-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {outgoing.map((r) => (
            <tr key={r.id} className="border-b hover:bg-cyan-50 transition">
              <td classname="p-3">{centerNames[r.fulfillingCenterId] || "Loading..."}</td>
              <td classname="p-3">{r.medicineName}</td>
              <td classname="p-3">{r.quantityRequested}</td>
             <td className="p-3">
  {r.status === "pending" && (
    <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm">
      Pending
    </span>
  )}

  {r.status === "approved" && (
    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm">
      Approved
    </span>
  )}

  {r.status === "rejected" && (
    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
      Rejected
    </span>
  )}
</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}

export default Requests;