import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // <--- Ensure this is imported like this
import { Download } from 'lucide-react';

const ReportButton = () => {
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    
    try {
        // 1. Fetch live data for the report
        const token = localStorage.getItem('token');
        // NOTE: Make sure this URL matches your backend port (usually 5000)
        const res = await fetch('http://localhost:5000/api/rooms', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
            throw new Error(`Server returned ${res.status}`);
        }

        const rooms = await res.json();
        const doc = new jsPDF();
        
        // 2. Build PDF Header
        doc.setFontSize(22);
        doc.setTextColor(41, 128, 185); // Blue title
        doc.text("EMS System Status Report", 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
        doc.text("System Status: OPERATIONAL", 14, 33);
        
        // 3. Build Table Data
        const tableData = rooms.map(r => [
            r.name,
            `${r.temperature || 0}°C`, // Safety fallback if data is missing
            `${r.humidity || 0}%`,
            `${r.pressure || 0} Pa`,
            r.status === 'active' ? 'OK' : 'ALERT'
        ]);

        // 4. Generate Table
        autoTable(doc, {
            startY: 40,
            head: [['Room Name', 'Temperature', 'Humidity', 'Pressure', 'Status']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] }, // Blue header
            styles: { fontSize: 10, cellPadding: 3 },
        });

        // 5. Save
        doc.save('EMS_Full_Report.pdf');

    } catch (err) {
        console.error("Report Error:", err);
        alert(`Failed to generate report.\nError: ${err.message}\n\nCheck if your backend is running on port 5000.`);
    } finally {
        setLoading(false);
    }
  };

  return (
    <button 
      onClick={generateReport} 
      disabled={loading}
      className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow flex items-center gap-2 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <Download size={18} />
      {loading ? "Generating..." : "Download Report"}
    </button>
  );
};

export default ReportButton;