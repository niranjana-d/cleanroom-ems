import { useState } from 'react';
import axios from 'axios';

const DigitalSignature = ({ isOpen, onClose, onVerified }) => {
  const [password, setPassword] = useState("");

  if (!isOpen) return null;

  const handleVerify = async () => {
    try {
      // Connects to the backend route we just made!
      const res = await axios.post('http://localhost:5000/api/verify-signature', { password });
      if (res.data.success) {
        onVerified();
        onClose();
        alert("✅ Signature Verified!");
      }
    } catch (err) {
      alert("❌ Wrong Password. Try 'admin123'");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded shadow-xl w-80">
        <h2 className="font-bold text-lg mb-2">🔐 Signature Required</h2>
        <p className="text-sm text-gray-500 mb-4">Enter password to acknowledge alert.</p>
        
        <input 
          type="password" 
          className="border p-2 w-full mb-4" 
          placeholder="Password" 
          onChange={(e) => setPassword(e.target.value)} 
        />
        
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-gray-500">Cancel</button>
          <button onClick={handleVerify} className="bg-green-600 text-white px-4 py-2 rounded">Verify</button>
        </div>
      </div>
    </div>
  );
};

export default DigitalSignature;