import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TrendingUp, TrendingDown, BarChart3, PieChart, Activity } from 'lucide-react';

// Enhanced Chart Component
const EnhancedChart = ({ data, type = 'line', height = 200, animated = true, interactive = true }) => {
  const canvasRef = useRef(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const drawLineChart = useCallback((ctx, data, width, height, animated) => {
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Find min/max values
    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue;

    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= data.length - 1; i++) {
      const x = padding + (chartWidth / (data.length - 1)) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Draw line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = padding + (chartWidth / (data.length - 1)) * index;
      const yPos = height - padding - ((point.value - minValue) / range) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, yPos);
      } else {
        ctx.lineTo(x, yPos);
      }
    });

    ctx.stroke();

    // Draw points
    data.forEach((point, index) => {
      const x = padding + (chartWidth / (data.length - 1)) * index;
      const yPos = height - padding - ((point.value - minValue) / range) * chartHeight;

      ctx.fillStyle = hoveredPoint === index ? '#ef4444' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(x, yPos, hoveredPoint === index ? 6 : 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [hoveredPoint]);

  const drawBarChart = useCallback((ctx, data, width, height, animated) => {
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    const barWidth = chartWidth / data.length * 0.8;
    const barSpacing = chartWidth / data.length * 0.2;

    const maxValue = Math.max(...data.map(d => d.value));

    data.forEach((item, index) => {
      const barHeight = (item.value / maxValue) * chartHeight;
      const x = padding + index * (barWidth + barSpacing);
      const barY = height - padding - barHeight;

      // Draw bar
      ctx.fillStyle = `hsl(${220 + index * 30}, 70%, 50%)`;
      ctx.fillRect(x, barY, barWidth, barHeight);

      // Draw value label
      ctx.fillStyle = '#374151';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(item.value.toString(), x + barWidth / 2, barY - 5);
    });
  }, []);

  const drawPieChart = useCallback((ctx, data, width, height, animated) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;

    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = -Math.PI / 2;

    data.forEach((item, index) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      
      // Draw slice
      ctx.fillStyle = `hsl(${index * 60}, 70%, 50%)`;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fill();

      // Draw label
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
      const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round((item.value / total) * 100)}%`, labelX, labelY);

      currentAngle += sliceAngle;
    });
  }, []);

  useEffect(() => {
    if (!data || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw chart based on type
    switch (type) {
      case 'line':
        drawLineChart(ctx, data, width, height, animated);
        break;
      case 'bar':
        drawBarChart(ctx, data, width, height, animated);
        break;
      case 'pie':
        drawPieChart(ctx, data, width, height, animated);
        break;
      default:
        // Add default case to satisfy ESLint
        break;
    }
  }, [data, type, animated, drawLineChart, drawBarChart, drawPieChart]);

  const handleMouseMove = (e) => {
    if (!interactive || type !== 'line') return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Find closest point
    const padding = 40;
    const chartWidth = canvas.width - 2 * padding;
    let closestPoint = -1;
    let minDistance = Infinity;

    data.forEach((point, index) => {
      const pointX = padding + (chartWidth / (data.length - 1)) * index;
      const distance = Math.abs(x - pointX);
      
      if (distance < minDistance && distance < 20) {
        minDistance = distance;
        closestPoint = index;
      }
    });

    setHoveredPoint(closestPoint);
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={400}
        height={height}
        className="w-full border rounded-lg"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
      />
      
      {hoveredPoint !== null && (
        <div className="absolute bg-gray-900 text-white px-2 py-1 rounded text-sm pointer-events-none">
          {data[hoveredPoint].label}: {data[hoveredPoint].value}
        </div>
      )}
    </div>
  );
};

// Statistics Cards Component
const StatCard = ({ title, value, change, trend, icon: Icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200'
  };

  return (
    <div className={`p-6 rounded-lg border ${colorClasses[color]} transition-all duration-300 hover:shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          
          {change && (
            <div className="flex items-center mt-2 text-sm">
              {trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                {change}
              </span>
              <span className="text-gray-500 ml-1">vs last month</span>
            </div>
          )}
        </div>
        
        {Icon && (
          <div className="p-3 rounded-full bg-white bg-opacity-50">
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
};

// Progress Ring Component
const ProgressRing = ({ progress, size = 120, strokeWidth = 8, color = '#3b82f6' }) => {
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold">{progress}%</span>
      </div>
    </div>
  );
};

// Trend Indicator Component
const TrendIndicator = ({ data, timeframe = '7d' }) => {
  const calculateTrend = () => {
    if (data.length < 2) return { direction: 'flat', percentage: 0 };
    
    const latest = data[data.length - 1].value;
    const previous = data[data.length - 2].value;
    const percentage = ((latest - previous) / previous) * 100;
    
    return {
      direction: percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'flat',
      percentage: Math.abs(percentage).toFixed(1)
    };
  };

  const trend = calculateTrend();

  return (
    <div className="flex items-center space-x-2">
      <div className={`flex items-center px-2 py-1 rounded text-sm font-medium ${
        trend.direction === 'up' 
          ? 'bg-green-100 text-green-800' 
          : trend.direction === 'down'
          ? 'bg-red-100 text-red-800'
          : 'bg-gray-100 text-gray-800'
      }`}>
        {trend.direction === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
        {trend.direction === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
        {trend.direction === 'flat' && <Activity className="w-3 h-3 mr-1" />}
        {trend.percentage}%
      </div>
      <span className="text-sm text-gray-500">{timeframe}</span>
    </div>
  );
};

// Heatmap Component
const Heatmap = ({ data, width = 300, height = 200 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!data || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const cellWidth = width / data[0].length;
    const cellHeight = height / data.length;
    const maxValue = Math.max(...data.flat());

    data.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        const intensity = value / maxValue;
        const hue = 220; // Blue hue
        const saturation = intensity * 100;
        const lightness = 90 - intensity * 40;
        
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        ctx.fillRect(
          colIndex * cellWidth,
          rowIndex * cellHeight,
          cellWidth,
          cellHeight
        );

        // Add value text
        if (intensity > 0.5) {
          ctx.fillStyle = '#ffffff';
        } else {
          ctx.fillStyle = '#374151';
        }
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          value.toString(),
          colIndex * cellWidth + cellWidth / 2,
          rowIndex * cellHeight + cellHeight / 2 + 4
        );
      });
    });
  }, [data, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border rounded-lg"
    />
  );
};

// Main Dashboard Component
const DataVisualizationDashboard = ({ userInsights, nftData, salesData }) => {
  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Views"
          value={userInsights?.activity?.totalViews || 0}
          change="+12%"
          trend="up"
          icon={Activity}
          color="blue"
        />
        <StatCard
          title="Total Searches"
          value={userInsights?.activity?.totalSearches || 0}
          change="+8%"
          trend="up"
          icon={BarChart3}
          color="green"
        />
        <StatCard
          title="Purchases"
          value={userInsights?.activity?.totalPurchases || 0}
          change="-2%"
          trend="down"
          icon={PieChart}
          color="purple"
        />
        <StatCard
          title="Favorites"
          value="24"
          change="+15%"
          trend="up"
          icon={TrendingUp}
          color="red"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">NFT Views Over Time</h3>
          <EnhancedChart
            data={nftData || [
              { label: 'Mon', value: 12 },
              { label: 'Tue', value: 19 },
              { label: 'Wed', value: 15 },
              { label: 'Thu', value: 25 },
              { label: 'Fri', value: 22 },
              { label: 'Sat', value: 30 },
              { label: 'Sun', value: 28 }
            ]}
            type="line"
            height={250}
          />
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Category Distribution</h3>
          <EnhancedChart
            data={[
              { label: 'Art', value: 45 },
              { label: 'Gaming', value: 25 },
              { label: 'Music', value: 20 },
              { label: 'Sports', value: 10 }
            ]}
            type="pie"
            height={250}
          />
        </div>
      </div>

      {/* Progress and Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border text-center">
          <h3 className="text-lg font-semibold mb-4">Profile Completion</h3>
          <ProgressRing progress={75} />
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Market Trends</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>ETH Price</span>
              <TrendIndicator 
                data={[
                  { value: 2000 },
                  { value: 2100 },
                  { value: 2250 }
                ]}
              />
            </div>
            <div className="flex justify-between items-center">
              <span>NFT Sales</span>
              <TrendIndicator 
                data={[
                  { value: 100 },
                  { value: 120 },
                  { value: 115 }
                ]}
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Activity Heatmap</h3>
          <Heatmap
            data={[
              [1, 3, 5, 2],
              [4, 7, 2, 8],
              [2, 5, 9, 3],
              [6, 1, 4, 7]
            ]}
            width={250}
            height={150}
          />
        </div>
      </div>
    </div>
  );
};

export {
  EnhancedChart,
  StatCard,
  ProgressRing,
  TrendIndicator,
  Heatmap,
  DataVisualizationDashboard
};

export default DataVisualizationDashboard; 