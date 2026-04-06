import { createClient } from '@supabase/supabase-js'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  LayoutDashboard, ShieldCheck, Bell, Users, FileClock, Clock, History, Cloud, Settings as SettingsIcon, LogOut, Plus, X, Thermometer, Droplets, Wind, Activity 
} from 'lucide-react';

import ReportButton from './components/ReportButton';
import FloorPlan from './components/FloorPlan';
import DigitalSignature from './components/DigitalSignature';
import { calculateTrend } from './utils/trendLogic'; 

const AuthContext = createContext(null);
const API_URL = 'http://localhost:5000/api'; 
const supabaseUrl = 'https://zxpuglcotakiourlfijd.supabase.co'; // Your project URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cHVnbGNvdGFraW91cmxmaWpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODM4NTYsImV4cCI6MjA4MzI1OTg1Nn0.upSazEXKak2SMlwJBGntOQga_29TWGbrPsmjCabL84s'; // Your public anon key

const supabase = createClient(supabaseUrl, supabaseAnonKey); //


// --- AUTH PROVIDER ---
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const login = (userData, token) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    setUser(userData);
  };
  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
};

// --- SIDEBAR ---
const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);

  const allMenuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/', roles: ['admin', 'manager', 'operator'] },
    { icon: <ShieldCheck size={20} />, label: 'Room Monitoring', path: '/monitoring', roles: ['admin', 'manager', 'operator'] },
    { icon: <Bell size={20} />, label: 'Alert Center', path: '/alerts', roles: ['admin', 'manager', 'operator'] },
    { icon: <Users size={20} />, label: 'User Roles', path: '/users', roles: ['admin'] },
    { icon: <FileClock size={20} />, label: 'Batch Logs', path: '/batch-logs', roles: ['admin', 'manager'] },
    { icon: <History size={20} />, label: 'History Logs', path: '/history', roles: ['admin', 'manager', 'operator'] },
    { icon: <Cloud size={20} />, label: 'Cloud Backup', path: '/backup', roles: ['admin'] },
    { icon: <SettingsIcon size={20} />, label: 'Settings', path: '/settings', roles: ['admin', 'manager'] },
  ];

  const allowedItems = allMenuItems.filter(item => item.roles.includes(user?.role));

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 shadow-xl z-50">
      
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-blue-400 tracking-wider">EMS Dashboard</h1>
        <span className="text-xs text-slate-500 uppercase tracking-widest">{user?.role} View</span>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {allowedItems.map((item) => (
          <Link key={item.path} to={item.path} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              location.pathname === item.path ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}>
            {item.icon} <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <button onClick={logout} className="flex items-center gap-3 p-3 w-full rounded-lg text-red-400 hover:bg-red-900/20 transition-all">
          <LogOut size={20} /> <span>Logout</span>
        </button>
      </div>
    </div>
  );
};


// --- 1. DASHBOARD ---
// --- 1. DASHBOARD ---
const Dashboard = () => {
  const [rooms, setRooms] = useState([]);
  const [showSigModal, setShowSigModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const historyData = [24.0, 24.1, 24.2, 24.3, 24.5]; 

  useEffect(() => {
    const fetchData = () => {
        fetch(`${API_URL}/rooms`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setRooms(data); })
        .catch(console.error);
    };
    fetchData(); 
    const interval = setInterval(fetchData, 2000); 
    return () => clearInterval(interval);
  }, []);

  // --- 🔥 AUTO SOUND ALERT (No button needed) ---
  // Silently unlock audio on ANY user interaction (login click counts)
  useEffect(() => {
    let unlocked = false;
    const unlockAudio = () => {
      if (unlocked) return;
      const audio = document.getElementById("alertSound");
      if (audio) {
        // Play silently then immediately pause — this satisfies browser autoplay policy
        audio.volume = 0;
        audio.play().then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 1.0;
          unlocked = true;
          console.log("🔊 Audio unlocked via user interaction");
        }).catch(() => {});
      }
    };
    document.addEventListener("click", unlockAudio);
    document.addEventListener("keydown", unlockAudio);
    return () => {
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  // Trigger alarm sound when any room exceeds critical temperature
  useEffect(() => {
    const CRITICAL_TEMP = 25.0;
    const criticalRoom = rooms.find(r => (r.temperature || 0) > CRITICAL_TEMP);
    const audio = document.getElementById("alertSound");

    if (criticalRoom) {
        console.log("🔥 ALARM! Room " + criticalRoom.name + " is overheating!");
        document.body.style.backgroundColor = "#fee2e2";
        
        if (audio && audio.paused) {
            audio.volume = 1.0;
            audio.loop = true;
            audio.play().catch(() => {});
        }
    } else {
        document.body.style.backgroundColor = "#f8fafc";
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            audio.loop = false;
        }
    }
  }, [rooms]);
  // ---------------------------------------------

  const handleResolveClick = (roomName) => { setSelectedRoom(roomName); setShowSigModal(true); };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded shadow border-l-4 border-blue-600">
        <div><h2 className="text-3xl font-bold text-slate-800">System Overview</h2><p className="text-sm text-green-600 font-bold">● System Operational</p></div>
        <ReportButton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-bold text-gray-700">Live Sensors</h3>
          {rooms.map((room) => {
             const trend = calculateTrend(room.temperature || 0, historyData);
             return (
              <div key={room.id} className="bg-white p-6 rounded border-l-4 border-blue-500 shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div><h3 className="font-bold text-lg">{room.name}</h3><p className="text-xs text-gray-400">ID: {room.id}</p></div>
                  <div className="text-right"><span className={`text-xs font-bold ${trend === "rising" ? "text-red-500" : "text-green-500"}`}>{trend === "rising" ? "Rising ⬆️" : "Stable ➡️"}</span></div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                    <div className="bg-gray-50 p-2 rounded"><span className="block text-gray-500 text-xs uppercase">Temp</span><span className={`block font-bold text-lg ${room.temperature > 25 ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>{room.temperature || 0}°C</span></div>
                    <div className="bg-gray-50 p-2 rounded"><span className="block text-gray-500 text-xs uppercase">Hum</span><span className="block font-bold text-lg text-blue-600">{room.humidity || 0}%</span></div>
                    <div className="bg-gray-50 p-2 rounded"><span className="block text-gray-500 text-xs uppercase">Press</span><span className="block font-bold text-lg text-green-600">{room.pressure || 0}Pa</span></div>
                </div>
                <div className="pt-2 border-t flex justify-between items-center"><span className="text-xs text-gray-400">Live</span><button onClick={() => handleResolveClick(room.name)} className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded font-bold hover:bg-red-200">Resolve Alert</button></div>
              </div>
             );
          })}
        </div>
        <div className="lg:col-span-2"><FloorPlan /></div>
      </div>
      <DigitalSignature isOpen={showSigModal} onClose={() => setShowSigModal(false)} onVerified={() => { alert("Verified!"); setShowSigModal(false); }} />
    </div>
  );
};

// --- 2. ROOM MONITORING ---
// --- 2. ROOM MONITORING (Dynamic Version) ---
const RoomMonitoring = () => {
  const [rooms, setRooms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Fetch Rooms
  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      // Ensure your backend server.js has the GET /api/rooms route!
      const res = await fetch(`${API_URL}/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setRooms(data);
    } catch (err) {
      console.error("Error fetching rooms:", err);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000); // Live update every 3s
    return () => clearInterval(interval);
  }, []);

  // 2. Add Room Function
  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName) return;
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      // Ensure your backend server.js has the POST /api/rooms route!
      const res = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ name: newRoomName })
      });

      if (res.ok) {
        setNewRoomName("");
        setShowModal(false);
        fetchRooms(); // Refresh list immediately
      } else {
        alert("Failed to add room. Check console.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteRoom = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${name}? This will erase all history logs.`)) return;

    try {
        const res = await fetch(`${API_URL}/rooms/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });

        if (res.ok) {
            fetchRooms(); // Refresh the list
        } else {
            alert("Action failed. Ensure you are logged in as Admin.");
        }
    } catch (err) {
        console.error(err);
    }
};

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-slate-800">Room Monitoring</h1>
            <p className="text-slate-500 mt-1">Live environmental status of all facility zones.</p>
        </div>
        
        {/* ADD ROOM BUTTON */}
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
        >
          <Plus size={20} /> Add New Room
        </button>
      </div>

      {/* ROOMS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          
          <div key={room.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow relative">
            
            {/* Status Stripe */}
            <div className={`h-2 w-full ${room.status === 'alert' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>

            {/* Room Header */}
            <div className="p-4 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-700">{room.name}</h3>
                <button 
            onClick={() => handleDeleteRoom(room.id, room.name)}
            className="text-slate-300 hover:text-red-500 transition-colors p-1"
            title="Delete Room"
        >
            <X size={18} />
        </button>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${room.status === 'alert' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {room.status === 'active' ? 'Active' : 'Alert'}
                </span>
            </div>

            {/* Room Metrics */}
            <div className="px-6 pb-6 grid grid-cols-3 gap-4">
                <div className="text-center">
                    <div className="text-slate-400 mb-1 flex justify-center"><Thermometer size={18}/></div>
                    <div className="font-bold text-slate-700 text-lg">{room.temperature || 0}°C</div>
                    <div className="text-xs text-slate-400">Temp</div>
                </div>
                <div className="text-center border-l border-slate-100">
                    <div className="text-slate-400 mb-1 flex justify-center"><Droplets size={18}/></div>
                    <div className="font-bold text-blue-600 text-lg">{room.humidity || 0}%</div>
                    <div className="text-xs text-slate-400">Humidity</div>
                </div>
                <div className="text-center border-l border-slate-100">
                    <div className="text-slate-400 mb-1 flex justify-center"><Wind size={18}/></div>
                    <div className="font-bold text-emerald-600 text-lg">{room.pressure || 0}</div>
                    <div className="text-xs text-slate-400">Pressure</div>
                </div>
            </div>

            {/* Link to Detail Page */}
             <div className="p-4 border-t border-slate-100 bg-slate-50">
                <Link to={`/room/${room.id}`} className="block w-full text-center bg-white border border-slate-300 text-slate-600 py-2 rounded hover:bg-slate-100 transition font-bold text-sm shadow-sm">
                   View History & Graphs
                </Link>
             </div>
          </div>
          
        ))}
      </div>

      {/* --- ADD ROOM MODAL (Popup) --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Add New Cleanroom</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                </button>
            </div>
            
            <form onSubmit={handleAddRoom}>
                <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Room Name</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Storage Area C" 
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        autoFocus
                    />
                </div>
                
                <div className="flex gap-3">
                    <button 
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="w-1/2 py-3 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-1/2 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex justify-center items-center"
                    >
                        {loading ? <Activity className="animate-spin" /> : "Save Room"}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// --- 3. ALERT CENTER ---
// --- REPLACE THE ENTIRE AlertCenter COMPONENT IN App.jsx ---
// --- REPLACE AlertCenter IN App.jsx ---
const AlertCenter = () => {
  const [alerts, setAlerts] = useState([]);
  const [showSigModal, setShowSigModal] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  
  const refreshAlerts = () => {
    fetch(`${API_URL}/alerts`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    .then(res => res.json())
    .then(data => { if(Array.isArray(data)) setAlerts(data); })
    .catch(console.error);
  };

  useEffect(() => { 
      refreshAlerts(); 
      const interval = setInterval(refreshAlerts, 2000); 
      return () => clearInterval(interval);
  }, []);

  const handleAcknowledgeClick = (id) => {
      setSelectedAlertId(id);
      setShowSigModal(true);
  };

  const onVerified = async () => {
      // Changed to PUT to mark as resolved
      await fetch(`${API_URL}/alerts/${selectedAlertId}/resolve`, { 
          method: 'PUT', 
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
      });
      setShowSigModal(false);
      refreshAlerts();
      alert("Alert Marked as Resolved ✅");
  };

  return (
    <div className="p-8">
        <h2 className="text-2xl font-bold mb-6">Alert Center</h2>
        <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-100 uppercase text-sm">
                    <tr><th className="p-4">Time</th><th className="p-4">Details</th><th className="p-4">Action</th></tr>
                </thead>
                <tbody>
                    {alerts.length === 0 && <tr><td colSpan="3" className="p-4 text-center">No active alerts</td></tr>} 
                    {alerts.map(a => {
                        // Check if resolved
                        const isResolved = a.status === 'resolved';
                        
                        return (
                            <tr key={a.id} className={`border-t transition-colors ${isResolved ? "bg-gray-100 text-gray-400" : "hover:bg-red-50"}`}>
                                <td className="p-4">{new Date(a.timestamp).toLocaleString()}</td>
                                <td className={`p-4 font-bold ${isResolved ? "text-gray-400 decoration-slate-400" : "text-red-600"}`}>
                                    {isResolved && "✅ "}{a.details}
                                </td>
                                <td className="p-4">
                                    {isResolved ? (
                                        <span className="text-gray-400 font-bold text-xs uppercase border border-gray-300 px-2 py-1 rounded">
                                            Resolved
                                        </span>
                                    ) : (
                                        <button 
                                            onClick={() => handleAcknowledgeClick(a.id)}
                                            className="text-blue-600 underline font-bold hover:text-blue-800"
                                        >
                                            Acknowledge
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
        <DigitalSignature isOpen={showSigModal} onClose={() => setShowSigModal(false)} onVerified={onVerified} />
    </div>
  );
};

// --- 4. SETTINGS (FIXED: ALL FIELDS) ---
const Settings = () => {
  const [rooms, setRooms] = useState([]); 
  const [selectedRoom, setSelectedRoom] = useState(1); 
  const [formData, setFormData] = useState({ temp_min:0, temp_max: 0, humidity_min:0, humidity_max: 0, press_min:0, press_max:0 }); 
  const [msg, setMsg] = useState('');

  useEffect(() => { 
      fetch(`${API_URL}/rooms`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => res.json()).then(data => { if(Array.isArray(data)) { setRooms(data); if(data[0]) setSelectedRoom(data[0].id); } });
  }, []);

  useEffect(() => { 
      fetch(`${API_URL}/settings/${selectedRoom}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => res.json())
      .then(data => setFormData(data || {})); 
  }, [selectedRoom]);

  const handleSave = async (e) => { 
      e.preventDefault(); 
      await fetch(`${API_URL}/settings/${selectedRoom}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify(formData) }); 
      setMsg('✅ Settings Saved!'); setTimeout(() => setMsg(''), 2000); 
  };

  const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

  return (
    <div className="p-8">
        <h2 className="text-2xl font-bold mb-6">System Configuration</h2>
        <div className="bg-white p-6 rounded shadow max-w-4xl">
            <label className="block font-bold mb-2">Select Room:</label>
            <select className="mb-6 p-2 border w-full rounded" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>{rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
            
            <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="p-4 bg-red-50 rounded border border-red-100">
                      <h4 className="font-bold text-red-600 mb-2">Temperature (°C)</h4>
                      <div className="mb-2"><label className="text-xs font-bold text-gray-500">Min</label><input name="temp_min" type="number" step="0.1" value={formData.temp_min || ''} onChange={handleChange} className="border p-2 w-full rounded" /></div>
                      <div><label className="text-xs font-bold text-gray-500">Max</label><input name="temp_max" type="number" step="0.1" value={formData.temp_max || ''} onChange={handleChange} className="border p-2 w-full rounded" /></div>
                   </div>
                   <div className="p-4 bg-blue-50 rounded border border-blue-100">
                      <h4 className="font-bold text-blue-600 mb-2">Humidity (%)</h4>
                      <div className="mb-2"><label className="text-xs font-bold text-gray-500">Min</label><input name="humidity_min" type="number" step="0.1" value={formData.humidity_min || ''} onChange={handleChange} className="border p-2 w-full rounded" /></div>
                      <div><label className="text-xs font-bold text-gray-500">Max</label><input name="humidity_max" type="number" step="0.1" value={formData.humidity_max || ''} onChange={handleChange} className="border p-2 w-full rounded" /></div>
                   </div>
                   <div className="p-4 bg-green-50 rounded border border-green-100">
                      <h4 className="font-bold text-green-600 mb-2">Pressure (Pa)</h4>
                      <div className="mb-2"><label className="text-xs font-bold text-gray-500">Min</label><input name="press_min" type="number" step="0.1" value={formData.press_min || ''} onChange={handleChange} className="border p-2 w-full rounded" /></div>
                      <div><label className="text-xs font-bold text-gray-500">Max</label><input name="press_max" type="number" step="0.1" value={formData.press_max || ''} onChange={handleChange} className="border p-2 w-full rounded" /></div>
                   </div>
                </div>
                <button className="bg-slate-900 text-white px-6 py-3 rounded font-bold w-full hover:bg-slate-800 text-lg">Save All Thresholds</button>
            </form>
            {msg && <p className="mt-4 text-center font-bold text-green-600 text-lg">{msg}</p>}
        </div>
    </div>
  );
};

// --- 5. HISTORY LOGS (FIXED: TABLE RESTORED) ---
// --- REPLACE HistoryLogs IN App.jsx ---
const HistoryLogs = () => {
  const [logs, setLogs] = useState([]);
  const [roomId, setRoomId] = useState(1);
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    // Safe Fetch for Rooms
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`${API_URL}/rooms`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { 
          if(Array.isArray(data) && data.length > 0) { 
              setRooms(data); 
              setRoomId(data[0].id); 
          } 
      })
      .catch(err => console.error("Room Fetch Error:", err));
  }, []);

  useEffect(() => {
    // Safe Fetch for History
    const token = localStorage.getItem('token');
    if (!token || !roomId) return;

    fetch(`${API_URL}/data/history/${roomId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { 
          // Safety check: ensure data is actually an array before setting it
          if(Array.isArray(data)) { setLogs(data); } else { setLogs([]); }
      })
      .catch(err => console.error("History Fetch Error:", err));
  }, [roomId]);

  const downloadCSV = () => {
    if (logs.length === 0) return alert("No data to export!");
    const headers = ["Timestamp,Temperature,Humidity,Pressure"];
    const rows = logs.map(log => 
        `${new Date(log.timestamp).toLocaleString()},${log.temperature},${log.humidity},${log.pressure}`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `history_room_${roomId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

 // --- REPLACE downloadPDF WITH THIS FIX ---
  const downloadPDF = () => {
    if (logs.length === 0) return alert("No data to export!");
    
    try {
        const doc = new jsPDF();
        
        // 1. Add Title
        doc.setFontSize(18);
        doc.text(`Sensor History Report: Room ${roomId}`, 14, 20);
        
        // 2. Add Timestamp
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
        
        // 3. Generate Table (The Fix: Pass 'doc' as the first argument)
        autoTable(doc, {
            startY: 35,
            head: [['Timestamp', 'Temperature', 'Humidity', 'Pressure']],
            body: logs.map(log => [
                new Date(log.timestamp).toLocaleString(),
                `${log.temperature}°C`,
                `${log.humidity}%`,
                `${log.pressure} Pa`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] },
        });
        
        // 4. Save
        doc.save(`history_room_${roomId}.pdf`);
        
    } catch (err) {
        console.error("PDF Error:", err);
        alert("Failed to generate PDF. Check console.");
    }
  };

// --- REPLACE THE ENTIRE RETURN BLOCK WITH THIS ---
return (
  <div className="bg-slate-50 min-h-screen font-sans">
    
    {/* PAGE CONTENT WRAPPER (controls centering & spacing) */}
    <div className="max-w-5xl mx-auto px-6 py-10">

      {/* 1. HEADER CARD */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 
                      flex flex-col md:flex-row justify-between items-center gap-4">
        
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Audit History Logs
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Review historical sensor data.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          
          {/* ROOM SELECT */}
          <div className="relative">
            <select
              className="appearance-none bg-slate-100 border border-slate-300 
                         text-slate-700 py-2 pl-4 pr-10 rounded-lg 
                         font-bold text-sm focus:ring-2 focus:ring-blue-500 
                         focus:outline-none cursor-pointer"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <div className="pointer-events-none absolute inset-y-0 right-0 
                            flex items-center px-3 text-slate-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* CSV */}
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 
                       text-white px-4 py-2 rounded-lg font-bold text-xs uppercase 
                       tracking-wide transition-all shadow-sm active:scale-95"
          >
            <Clock size={16} />
            CSV
          </button>

          {/* PDF */}
          <button
            onClick={downloadPDF}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 
                       text-white px-4 py-2 rounded-lg font-bold text-xs uppercase 
                       tracking-wide transition-all shadow-sm active:scale-95"
          >
            <Clock size={16} />
            PDF
          </button>
        </div>
      </div>

      {/* 2. HISTORY TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">

          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4 pl-6 text-xs font-bold uppercase tracking-wider 
                               text-slate-600 border-b border-slate-200">
                  Time Recorded
                </th>
                <th className="p-4 pl-6 text-xs font-bold uppercase tracking-wider 
                               text-slate-600 border-b border-slate-200">
                  Temperature
                </th>
                <th className="p-4 pl-6 text-xs font-bold uppercase tracking-wider 
                               text-slate-600 border-b border-slate-200">
                  Humidity
                </th>
                <th className="p-4 pl-6 text-xs font-bold uppercase tracking-wider 
                               text-slate-600 border-b border-slate-200">
                  Pressure
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-400 italic">
                    No history data found.
                  </td>
                </tr>
              )}

              {logs.map((log, i) => (
                <tr
                  key={i}
                  className="hover:bg-slate-50 transition-colors duration-150"
                >
                  <td className="p-4 pl-6 text-sm font-medium text-slate-600">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>

                  <td className="p-4 pl-6">
                    <span className="bg-slate-100 px-2 py-1 rounded 
                                     font-bold text-slate-800">
                      {log.temperature}°C
                    </span>
                  </td>

                  <td className="p-4 pl-6 font-bold text-blue-600">
                    {log.humidity}%
                  </td>

                  <td className="p-4 pl-6 font-mono text-xs font-bold text-emerald-600">
                    {log.pressure} Pa
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      </div>

    </div>
  </div>
);

};

// --- 6. BATCH LOGS ---
// --- REPLACE BatchLogs IN App.jsx ---
const BatchLogs = () => {
  const [batches, setBatches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [newBatch, setNewBatch] = useState({ batchCode: '', roomId: '', productName: '' });
  const [showForm, setShowForm] = useState(false);

  const refreshData = () => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    fetch(`${API_URL}/batches`, { headers }).then(res => res.json()).then(data => { if(Array.isArray(data)) setBatches(data); });
    fetch(`${API_URL}/rooms`, { headers }).then(res => res.json()).then(data => { if(Array.isArray(data)) setRooms(data); });
  };
  
  useEffect(() => { 
      refreshData(); 
      const interval = setInterval(refreshData, 3000); 
      return () => clearInterval(interval);
  }, []);

  const handleStart = async (e) => {
    e.preventDefault();
    if (!newBatch.roomId) return alert("Select a room");
    await fetch(`${API_URL}/batches`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify(newBatch) });
    setShowForm(false); setNewBatch({ batchCode: '', roomId: '', productName: '' }); refreshData();
  };
  
  const handleStop = async (id) => {
    if(!confirm("Are you sure you want to finish this batch?")) return;
    await fetch(`${API_URL}/batches/${id}/stop`, { method: 'PUT', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    refreshData();
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Batch Production Logs</h2>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow-md">
            {showForm ? 'Cancel' : '+ Start New Batch'}
          </button>
      </div>

      {showForm && (
        <div className="bg-slate-100 p-6 rounded-xl mb-6 border border-slate-200 shadow-inner">
          <form onSubmit={handleStart} className="flex flex-col md:flex-row gap-4">
            <input required placeholder="Batch Code (e.g. BTC-2024)" className="p-3 border rounded flex-1" value={newBatch.batchCode} onChange={e => setNewBatch({...newBatch, batchCode: e.target.value})} />
            <input required placeholder="Product Name" className="p-3 border rounded flex-1" value={newBatch.productName} onChange={e => setNewBatch({...newBatch, productName: e.target.value})} />
            <select className="p-3 border rounded flex-1 bg-white" value={newBatch.roomId} onChange={e => setNewBatch({...newBatch, roomId: e.target.value})}>
                <option value="">Select Room</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button className="bg-green-600 text-white px-6 py-3 rounded font-bold hover:bg-green-700">Initialize Batch</button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                <tr>
                    <th className="p-4">Batch Info</th>
                    <th className="p-4">Room</th>
                    <th className="p-4">Start Time</th>
                    <th className="p-4">End Time</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Action</th>
                </tr>
            </thead>
            <tbody>
              {batches.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-gray-400">No batch records found. Start one above.</td></tr>}
              {batches.map(batch => (
                <tr key={batch.id} className="border-t hover:bg-slate-50">
                  <td className="p-4">
                      <div className="font-bold text-slate-800">{batch.batch_code}</div>
                      <div className="text-xs text-slate-500">{batch.product_name}</div>
                  </td>
                  <td className="p-4">{batch.room_name || `Room ${batch.room_id}`}</td>
                  <td className="p-4 text-sm font-mono text-blue-600">
                      {new Date(batch.start_time).toLocaleString()}
                  </td>
                  <td className="p-4 text-sm font-mono text-slate-500">
                      {batch.end_time ? new Date(batch.end_time).toLocaleString() : '-'}
                  </td>
                  <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${batch.status === 'in-progress' ? 'bg-green-100 text-green-800 animate-pulse' : 'bg-gray-200 text-gray-600'}`}>
                          {batch.status}
                      </span>
                  </td>
                  <td className="p-4">
                      {batch.status === 'in-progress' && (
                          <button onClick={() => handleStop(batch.id)} className="bg-red-100 text-red-600 px-3 py-1 rounded font-bold text-xs hover:bg-red-200 border border-red-200">
                              STOP BATCH
                          </button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};
// --- 7. USER MANAGEMENT ---
const UserRoles = () => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'operator' });
  const [msg, setMsg] = useState('');
  const fetchUsers = () => fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()).then(data => { if(Array.isArray(data)) setUsers(data); });
  useEffect(() => { fetchUsers(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify(newUser) });
    if(res.ok) { setMsg("✅ User Added"); fetchUsers(); setNewUser({ email: '', password: '', role: 'operator' }); setTimeout(() => setMsg(''), 2000); } 
    else { alert("Error adding user"); }
  };
  const handleDelete = async (id) => { if(!confirm("Are you sure?")) return; await fetch(`${API_URL}/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }); fetchUsers(); };
  const handleRoleChange = async (id, newRole) => {
    setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
    await fetch(`${API_URL}/users/${id}/role`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ role: newRole }) });
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">User Management</h2>
      <form onSubmit={handleAdd} className="bg-white p-6 mb-6 rounded-xl shadow-sm border border-blue-100 flex gap-4 items-end">
        <div className="flex-1"><label className="text-xs font-bold text-gray-500 uppercase">Email</label><input className="w-full border p-2 rounded" placeholder="user@ems.com" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} /></div>
        <div className="flex-1"><label className="text-xs font-bold text-gray-500 uppercase">Password</label><input className="w-full border p-2 rounded" type="password" placeholder="******" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} /></div>
        <div><label className="text-xs font-bold text-gray-500 uppercase">Role</label><select className="border p-2 rounded w-32 bg-white" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}><option value="operator">Operator</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>
        <button className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 h-10">Add User</button>
      </form>
      {msg && <p className="text-green-600 font-bold mb-4">{msg}</p>}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left"><thead className="bg-slate-100 text-slate-600 uppercase text-xs"><tr><th className="p-4">Email</th><th className="p-4">Role (Editable)</th><th className="p-4 text-center">Action</th></tr></thead><tbody>
          {users.map(u => (
            <tr key={u.id} className="border-t hover:bg-slate-50">
              <td className="p-4 font-bold text-slate-700">{u.email}</td>
              <td className="p-4"><select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)} className="p-1 rounded border text-xs font-bold uppercase cursor-pointer"><option value="operator">OPERATOR</option><option value="manager">MANAGER</option><option value="admin">ADMIN</option></select></td>
              <td className="p-4 text-center"><button onClick={() => handleDelete(u.id)} className="text-red-500 hover:text-red-700 font-bold text-xs border border-red-200 px-3 py-1 rounded hover:bg-red-50">Delete</button></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    </div>
  );
};

// --- 8. ROOM DETAIL (LIVE CHARTS) ---
const RoomDetail = () => {
    const { id } = useParams();
    const [history, setHistory] = useState([]);
    
    useEffect(() => {
        const fetchHistory = () => {
            fetch(`${API_URL}/data/history/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
            .then(res => res.json()).then(data => { if(Array.isArray(data)) setHistory(data); });
        };
        fetchHistory();
        const interval = setInterval(fetchHistory, 2000); 
        return () => clearInterval(interval);
    }, [id]);

    return (
        <div className="p-8">
            <Link to="/monitoring" className="text-blue-600 hover:underline mb-4 block">← Back to Rooms</Link>
            <h2 className="text-2xl font-bold mb-4">Live Analytics: Room {id}</h2>
            <div className="bg-white p-6 rounded-xl shadow-md h-96">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timestamp" tick={false}/>
                        <YAxis domain={['auto', 'auto']} />
                        <Tooltip />
                        <Line type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} name="Temp (°C)" dot={false} />
                        <Line type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={2} name="Humidity (%)" dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// --- 9. CLOUD BACKUP & OTHERS ---
// --- 9. CLOUD BACKUP (UPGRADED) ---
const CloudBackup = () => { 
    const [status, setStatus] = useState('Idle');
    const [backups, setBackups] = useState([]);
    


    // 1. Fetch Backup List
    const fetchHistory = async () => {
        const { data, error } = await supabase
            .storage
            .from('backups')
            .list('', { limit: 10, sortBy: { column: 'created_at', order: 'desc' } });
        
        if (data) setBackups(data);
    };

    useEffect(() => { fetchHistory(); }, []);

    // 2. Manual Backup Trigger
    const runBackup = async () => { 
        setStatus('⏳ Backing up...'); 
        try {
            const res = await fetch(`${API_URL}/backup/trigger`, { 
                method: 'POST', 
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
            });
            if (res.ok) {
                setStatus('✅ Backup Complete');
                fetchHistory(); // Refresh list immediately
            } else {
                setStatus('❌ Failed');
            }
        } catch (err) {
            setStatus('❌ Error connecting to server');
        }
    };

    // 3. Download/View File
    const handleView = (fileName) => {
        const { data } = supabase.storage.from('backups').getPublicUrl(fileName);
        window.open(data.publicUrl, '_blank');
    };

    return (
        <div className="p-8">
            <h2 className="text-2xl font-bold mb-6">Cloud Disaster Recovery</h2>
            
            {/* Control Panel */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 mb-8 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-slate-700">Manual Override</h3>
                    <p className="text-sm text-slate-500">Trigger an immediate snapshot of the local database to cloud.</p>
                </div>
                <div className="text-right">
                    <p className="mb-2 font-bold text-sm text-slate-600">Status: {status}</p>
                    <button onClick={runBackup} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 shadow-md transition-transform active:scale-95">
                        Trigger Cloud Sync Now
                    </button>
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <h3 className="font-bold text-slate-700">Backup History (Supabase Storage)</h3>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                        <tr>
                            <th className="p-4">Filename</th>
                            <th className="p-4">Date Uploaded</th>
                            <th className="p-4">Size</th>
                            <th className="p-4">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {backups.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-slate-400">No backups found in cloud yet.</td></tr>}
                        {backups.map((file) => (
                            <tr key={file.id} className="border-t hover:bg-slate-50">
                                <td className="p-4 font-mono text-sm font-medium text-slate-700">{file.name}</td>
                                <td className="p-4 text-sm text-slate-500">{new Date(file.created_at).toLocaleString()}</td>
                                <td className="p-4 text-sm text-slate-500">{(file.metadata.size / 1024).toFixed(2)} KB</td>
                                <td className="p-4">
                                    <button 
                                        onClick={() => handleView(file.name)}
                                        className="text-blue-600 hover:text-blue-800 font-bold text-xs border border-blue-200 px-3 py-1 rounded hover:bg-blue-50"
                                    >
                                        VIEW DATA
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    ); 
};

// --- 10. LOGIN ---
const Login = () => {
  const { login } = useContext(AuthContext); const navigate = useNavigate(); const [formData, setFormData] = useState({ email: '', password: '', role: 'operator' });
  const handleSubmit = async (e) => { e.preventDefault(); try { const res = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) }); if (res.ok) { const data = await res.json(); login(data.user, data.token); navigate('/'); } else { alert('Login failed'); } } catch (err) { alert('Backend error'); } };
  return (
    <div className="h-screen flex items-center justify-center bg-slate-100"><form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-lg w-96"><h2 className="text-2xl font-bold mb-6">Login</h2><input className="w-full mb-4 p-3 border rounded" placeholder="Email" onChange={e => setFormData({...formData, email: e.target.value})} /><input className="w-full mb-4 p-3 border rounded" type="password" placeholder="Password" onChange={e => setFormData({...formData, password: e.target.value})} /><select className="w-full mb-6 p-3 border rounded" onChange={e => setFormData({...formData, role: e.target.value})}><option value="operator">Operator</option><option value="manager">Manager</option><option value="admin">Admin</option></select><button className="w-full bg-blue-900 text-white p-3 rounded font-bold">Sign In</button></form></div>
  );
};

const Layout = ({ children }) => (<div className="flex min-h-screen bg-slate-50"><Sidebar /><div className="flex-1 ml-64">{children}</div></div>);
const RequireRole = ({ children, allowedRoles }) => { const { user } = useContext(AuthContext); if (!user) return <Navigate to="/login" />; if (!allowedRoles.includes(user.role)) return <div className="p-8 text-center text-red-600 font-bold">Access Denied</div>; return <Layout>{children}</Layout>; };



export default function App() {
  return (
    
    <BrowserRouter>
    <audio id="alertSound" src="/siren.mp3" preload="auto"></audio>
      <AuthProvider>
        
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireRole allowedRoles={['admin', 'manager', 'operator']}><Dashboard /></RequireRole>} />
          <Route path="/monitoring" element={<RequireRole allowedRoles={['admin', 'manager', 'operator']}><RoomMonitoring /></RequireRole>} />
          <Route path="/room/:id" element={<RequireRole allowedRoles={['admin', 'manager', 'operator']}><RoomDetail /></RequireRole>} />
          <Route path="/alerts" element={<RequireRole allowedRoles={['admin', 'manager', 'operator']}><AlertCenter /></RequireRole>} />
          <Route path="/users" element={<RequireRole allowedRoles={['admin']}><UserRoles /></RequireRole>} />
          <Route path="/batch-logs" element={<RequireRole allowedRoles={['admin', 'manager']}><BatchLogs /></RequireRole>} />
          <Route path="/history" element={<RequireRole allowedRoles={['admin', 'manager', 'operator']}><Layout><HistoryLogs /></Layout></RequireRole>} />
          <Route path="/backup" element={<RequireRole allowedRoles={['admin']}><CloudBackup /></RequireRole>} />
          <Route path="/settings" element={<RequireRole allowedRoles={['admin', 'manager']}><Settings /></RequireRole>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}