import { useState, useEffect, useMemo } from 'react';
import { studyTaskDB } from '../db';
import { formatDate } from '../utils';
import { useTheme } from '../contexts/ThemeContext';

interface HeatmapData {
  date: string;
  count: number;
  level: number;
}

interface CalendarHeatmapProps {
  projectId?: string;
}

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

const LIGHT_COLORS = ['#f7fee7', '#d9f99d', '#bef264', '#a3e635', '#84cc16'];
const DARK_COLORS = ['#1e3a08', '#365314', '#4d7c0f', '#65a30d', '#84cc16'];

export default function CalendarHeatmap({ projectId }: CalendarHeatmapProps) {
  const { darkMode } = useTheme();
  const [data, setData] = useState<HeatmapData[]>([]);
  const [tooltip, setTooltip] = useState<{ date: string; count: number; x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const tasks = await studyTaskDB.getAll();
      const validTasks = Array.isArray(tasks) ? tasks : [];

      const countMap: Record<string, number> = {};
      for (const task of validTasks) {
        if (task && task.status === 'completed' && task.completedAt) {
          const date = formatDate(task.completedAt);
          countMap[date] = (countMap[date] || 0) + 1;
        }
      }

      const today = new Date();
      const cells: HeatmapData[] = [];
      for (let i = 364; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = formatDate(d.toISOString());
        const count = countMap[dateStr] || 0;
        cells.push({
          date: dateStr,
          count,
          level: getLevel(count),
        });
      }
      setData(cells);
    } catch (err) {
      console.error('CalendarHeatmap loadData error:', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const getLevel = (count: number): number => {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 10) return 3;
    return 4;
  };

  const getColor = (level: number): string => {
    const colors = darkMode ? DARK_COLORS : LIGHT_COLORS;
    return colors[level] || colors[0];
  };

  const weeks = useMemo(() => {
    const result: HeatmapData[][] = [];
    if (data.length === 0) return result;
    const firstDay = new Date(data[0].date);
    const startDayOfWeek = firstDay.getDay() || 7;
    const padding = startDayOfWeek === 1 ? 0 : startDayOfWeek - 1;
    for (let i = 0; i < padding; i++) {
      if (result.length === 0) result.push([]);
      result[0].push(null as unknown as HeatmapData);
    }
    for (const cell of data) {
      const d = new Date(cell.date);
      const dayOfWeek = d.getDay() || 7;
      if (dayOfWeek === 1 || result.length === 0) {
        result.push([]);
      }
      result[result.length - 1].push(cell);
    }
    return result;
  }, [data]);

  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    let lastMonth = -1;
    for (let i = 0; i < data.length; i++) {
      const d = new Date(data[i].date);
      const m = d.getMonth();
      if (m !== lastMonth) {
        labels.push({ label: months[m], col: Math.floor(i / 7) });
        lastMonth = m;
      }
    }
    return labels;
  }, [data]);

  const handleMouseEnter = (e: React.MouseEvent, cell: HeatmapData) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const container = (e.target as HTMLElement).closest('.heatmap-wrapper');
    if (container) {
      const containerRect = container.getBoundingClientRect();
      setTooltip({
        date: cell.date,
        count: cell.count,
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top,
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  const handleTouchStart = (e: React.TouchEvent, cell: HeatmapData) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const container = (e.target as HTMLElement).closest('.heatmap-wrapper');
    if (container) {
      const containerRect = container.getBoundingClientRect();
      setTooltip({
        date: cell.date,
        count: cell.count,
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top,
      });
    }
  };

  const handleTouchEnd = () => {
    setTimeout(() => setTooltip(null), 2000);
  };

  const maxCount = useMemo(() => {
    return data.reduce((max, c) => Math.max(max, c.count), 0);
  }, [data]);

  const todayStr = formatDate(new Date().toISOString());

  if (loading) {
    return (
      <div className="card">
        <h3 className="font-semibold mb-3">🔥 学习打卡热力图</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
          <span className="ml-2 text-sm text-gray-400">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-semibold">🔥 学习打卡热力图</h3>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-400">少</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className="heatmap-cell"
              style={{
                backgroundColor: getColor(level),
                border: level === 0 ? '1px solid ' + (darkMode ? '#4d7c0f' : '#d9f99d') : 'none',
              }}
            />
          ))}
          <span className="text-gray-400">多</span>
        </div>
      </div>

      <div className="heatmap-container overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="heatmap-wrapper relative inline-block" style={{ minWidth: '750px' }}>
          <div className="flex mb-1" style={{ paddingLeft: '24px' }}>
            <div className="relative flex-1" style={{ height: '16px' }}>
              {monthLabels.map((ml, i) => (
                <span
                  key={i}
                  className="absolute text-[10px] text-primary-600 dark:text-primary-400"
                  style={{ left: `${ml.col * 15}px` }}
                >
                  {ml.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex">
            <div className="flex flex-col mr-1.5" style={{ gap: '3px', paddingTop: '2px' }}>
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="text-[9px] text-primary-400 dark:text-primary-500 flex items-center"
                  style={{ height: '14px', width: '20px' }}
                >
                  {i % 2 === 0 ? label : ''}
                </div>
              ))}
            </div>

            <div className="flex" style={{ gap: '3px' }}>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col" style={{ gap: '3px' }}>
                  {week.map((cell, di) => {
                    if (!cell) {
                      return <div key={di} className="heatmap-cell" style={{ backgroundColor: 'transparent' }} />;
                    }
                    const isToday = cell.date === todayStr;
                    return (
                      <div
                        key={di}
                        className="heatmap-cell relative"
                        style={{
                          backgroundColor: getColor(cell.level),
                          border: cell.level === 0 ? '1px solid ' + (darkMode ? '#4d7c0f' : '#d9f99d') : isToday ? '2px solid #65a30d' : 'none',
                          outline: isToday ? '1px solid #65a30d' : 'none',
                        }}
                        onMouseEnter={(e) => handleMouseEnter(e, cell)}
                        onMouseLeave={handleMouseLeave}
                        onTouchStart={(e) => handleTouchStart(e, cell)}
                        onTouchEnd={handleTouchEnd}
                      >
                        {tooltip && tooltip.date === cell.date && (
                          <div className="heatmap-tooltip">
                            <div className="font-medium">{cell.date}</div>
                            <div>{cell.count} 次打卡</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-400 flex items-center justify-between flex-wrap gap-2">
        <span>过去一年累计 {data.reduce((s, c) => s + c.count, 0)} 次打卡</span>
        <span>最高单日 {maxCount} 次</span>
      </div>
    </div>
  );
}