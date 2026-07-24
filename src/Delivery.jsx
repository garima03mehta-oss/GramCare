import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, increment, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase/config";
import { useAuth } from "./context/AuthContext";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";

function Delivery() {
  const { deliveryId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [delivery, setDelivery] = useState(null);
  const [fromCenter, setFromCenter] = useState(null);
  const [toCenter, setToCenter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const deliveryDoc = await getDoc(doc(db, "deliveries", deliveryId));
      if (!deliveryDoc.exists()) {
        setLoading(false);
        return;
      }
      const deliveryData = { id: deliveryDoc.id, ...deliveryDoc.data() };
      setDelivery(deliveryData);

      const fromDoc = await getDoc(doc(db, "centers", deliveryData.fromCenterId));
      const toDoc = await getDoc(doc(db, "centers", deliveryData.toCenterId));

      setFromCenter(fromDoc.exists() ? fromDoc.data() : null);
      setToCenter(toDoc.exists() ? toDoc.data() : null);
      setLoading(false);
    }
    fetchData();
  }, [deliveryId]);

  async function handleMarkDelivered() {
    if (!delivery) return;

    const invQuery = query(
      collection(db, "inventory"),
      where("centerId", "==", delivery.fromCenterId),
      where("medicineName", "==", delivery.medicineName)
    );
    const invSnapshot = await getDocs(invQuery);
    if (!invSnapshot.empty) {
      const fromInvDoc = invSnapshot.docs[0];
const currentQty = fromInvDoc.data().quantity;

if (delivery.quantity > currentQty) {
  alert("Not enough stock available!");
  return;
}

await updateDoc(doc(db, "inventory", fromInvDoc.id), {
  quantity: increment(-delivery.quantity)
});
    }

    const toInvQuery = query(
      collection(db, "inventory"),
      where("centerId", "==", delivery.toCenterId),
      where("medicineName", "==", delivery.medicineName)
    );
    const toInvSnapshot = await getDocs(toInvQuery);
    if (!toInvSnapshot.empty) {
      const toInvDoc = toInvSnapshot.docs[0];
      await updateDoc(doc(db, "inventory", toInvDoc.id), {
        quantity: increment(delivery.quantity)
      });
    } else {
      alert("Receiving center does not have this medicine in inventory yet. Please add it manually with 0 quantity first, then retry.");
      return;
    }

    await updateDoc(doc(db, "deliveries", delivery.id), {
      status: "completed",
      completedAt: new Date().toISOString()
    });

    alert("Delivery marked as completed. Inventory updated!");
    navigate("/requests");
  }

  if (loading) return <p>Loading...</p>;
  if (!delivery) return <p>Delivery not found.</p>;

  const canMarkDelivered =
    delivery.status === "in_transit" && currentUser.uid === delivery.fromCenterId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-cyan-50 to-teal-100 p-6">
     <div className="bg-gradient-to-r from-teal-600 via-cyan-500 to-blue-600 rounded-3xl shadow-xl p-6 mb-8 flex justify-between items-center">

  <div>
    <h1 className="text-4xl font-bold text-white">
      🚚 Delivery Details
    </h1>

    <p className="text-cyan-100 mt-2">
      Track medicine transfer between healthcare centers.
    </p>
  </div>

  <Link
    to="/requests"
    className="bg-white text-teal-700 px-5 py-3 rounded-xl font-semibold hover:bg-gray-100"
  >
    ← Requests
  </Link>

</div>
<div className="bg-white rounded-3xl shadow-xl p-6 mb-8">

<h2 className="text-2xl font-bold text-teal-700 mb-4">
  📦 Delivery Information
</h2>

<p className="text-gray-700 mb-2">
  💊 Medicine: <b>{delivery.medicineName}</b>
</p>

<p className="text-gray-700 mb-2">
  🔢 Quantity: <b>{delivery.quantity}</b>
</p>
<p className="text-gray-700 mb-2">
  🚦 Status:
  {delivery.status === "in_transit" ? (
    <span className="ml-2 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm">
      In Transit
    </span>
  ) : (
    <span className="ml-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm">
      Completed
    </span>
  )}
</p>
<p className="text-gray-700 mb-2">
  🏥 From: <b>{fromCenter ? fromCenter.name : "Loading..."}</b>
</p>

<p className="text-gray-700">
  🏥 To: <b>{toCenter ? toCenter.name : "Loading..."}</b>
</p>

</div>
      {fromCenter && toCenter && (
       <div className="bg-white rounded-3xl shadow-xl p-4 overflow-hidden mb-8">
  <div style={{ height: "400px", width: "100%" }}>
         <MapContainer
  center={[
    (fromCenter.latitude + toCenter.latitude) / 2,
    (fromCenter.longitude + toCenter.longitude) / 2
  ]}
  zoom={8}
  style={{ height: "100%", width: "100%" }}
>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <Marker position={[fromCenter.latitude, fromCenter.longitude]}>
              <Popup>{fromCenter.name} (Source)</Popup>
            </Marker>
            <Marker position={[toCenter.latitude, toCenter.longitude]}>
              <Popup>{toCenter.name} (Destination)</Popup>
            </Marker>
            <Polyline
              positions={[
                [fromCenter.latitude, fromCenter.longitude],
                [toCenter.latitude, toCenter.longitude]
              ]}
              color="blue"
            />
          </MapContainer>
        
      </div>
      </div>

      )}

      {canMarkDelivered && (
        <button
  onClick={handleMarkDelivered}
  className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold px-6 py-3 rounded-xl hover:scale-105 hover:shadow-lg transition"
>
  ✅ Mark as Delivered
</button>
      )}
    </div>
  );
}

export default Delivery;