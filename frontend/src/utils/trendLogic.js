export const calculateTrend = (current, history) => {
    // Need at least 5 readings to calculate a trend
    if (!history || history.length < 5) return "stable";

    // Get average of last 5 readings
    const last5 = history.slice(-5);
    const sum = last5.reduce((a, b) => a + b, 0);
    const avg = sum / last5.length;

    // Logic: If current is 0.5 degrees higher than average -> Rising
    if (current > avg + 0.5) return "rising"; 
    if (current < avg - 0.5) return "falling";
    return "stable";

    if (!historyArray || historyArray.length < 2) return "stable";
  
  // Simple logic: Compare current vs average of last few
    const previous = historyArray[historyArray.length - 1];
        if (currentValue > previous) return "rising";
        if (currentValue < previous) return "falling";
        return "stable";
};

