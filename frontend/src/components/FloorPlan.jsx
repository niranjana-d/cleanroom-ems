import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const LiveFloorPlan = () => {
  const [rooms, setRooms] = useState([]);
  
  // 1. Fetch live data every 2 seconds
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/rooms', {
           headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if(Array.isArray(data)) setRooms(data);
      } catch (err) {
        console.error("Floor Plan Error:", err);
      }
    };

    fetchRooms(); // Initial fetch
    const interval = setInterval(fetchRooms, 2000); // Live poll
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
        </span>
        Live Floor Plan
      </h3>

      {/* DYNAMIC GRID: Maps over the 'rooms' array */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rooms.map(room => {
          // Check Logic: Is temperature too high? (Assuming 25C is limit for demo)
          // You can also use room.status === 'alert' if your backend sets that.
          const isAlert = room.status === 'alert' || room.temperature > 24.0; // Tweak this number for your demo!
          
          return (
            <div 
              key={room.id} 
              className={`
                relative p-6 rounded-xl border-2 transition-all duration-500 flex flex-col justify-center items-center text-center
                ${isAlert 
                  ? "bg-red-50 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]" // Alert Style
                  : "bg-emerald-50 border-emerald-500" // Safe Style
                }
              `}
            >
              {/* Room Name */}
              <h4 className={`font-bold text-sm uppercase tracking-wider mb-2 ${isAlert ? "text-red-700" : "text-emerald-700"}`}>
                {room.name}
              </h4>

              {/* Live Temperature */}
              <div className="text-3xl font-black text-slate-800 mb-1">
                {room.temperature}°C
              </div>

              {/* Status Badge */}
              <div className={`
                flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full uppercase
                ${isAlert ? "bg-red-200 text-red-800 animate-pulse" : "bg-emerald-200 text-emerald-800"}
              `}>
                {isAlert ? <AlertTriangle size={12}/> : <CheckCircle size={12}/>}
                {isAlert ? "CRITICAL ALERT" : "OPTIMAL"}
              </div>
            </div>
          );
        })}

        {/* Empty State if no rooms found */}
        {rooms.length === 0 && (
          <div className="col-span-2 text-center p-4 text-slate-400 italic">
            Waiting for sensor data...
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveFloorPlan;