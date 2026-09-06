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
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const CELL_SIZE = 14;
const CELL_GAP = 3;
const COL_STEP = CELL_SIZE + CELL_GAP;

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

      const now = new Date();
      const year = now.getFullYear();
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);

      const cells: HeatmapData[] = [];
      const d = new Date(startDate);
      while (d <= endDate) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const count = countMap[dateStr] || 0;
        cells.push({
          date: dateStr,
          count,
          level: getLevel(count),
        });
        d.setDate(d.getDate() + 1);
      }
      setData(cells);
    } catch (err) {
      console.error('CalendarHeatmap loadData error:', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const startDayOfWeek = useMemo(() => {
    if (data.length === 0) return 0;
    const d = new Date(data[0].date);
    const dow = d.getDay() || 7;
    return dow - 1;
  }, [data]);

  const weeks = useMemo(() => {
    const result: HeatmapData[][] = [];
    if (data.length === 0) return result;

    for (let i = 0; i < startDayOfWeek; i++) {
      if (result.length === 0) result.push([]);
      result[0].push(null as unknown as HeatmapData);
    }

    for (const cell of data) {
      const d = new Date(cell.date);
      const dow = d.getDay() || 7;
      if (dow === 1 || result.length === 0) {
        result.push([]);
      }
      result[result.length - 1].push(cell);
    }
    return result;
  }, [data, startDayOfWeek]);

  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    const seen = new Set<number>();
    for (const cell of data) {
      const d = new Date(cell.date);
      const m = d.getMonth();
      if (!seen.has(m)) {
        seen.add(m);
        const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000);
        const col = Math.floor((dayOfYear + startDayOfWeek) / 7);
        labels.push({ label: MONTHS[m], col });
      }
    }
    return labels;
  }, [data, startDayOfWeek]);

  const todayStr = formatDate(new Date().toISOString());
  const totalCols = weeks.length;

  const handleCellEnter = (e: React.MouseEvent, cell: HeatmapData) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const wrapper = (e.currentTarget as HTMLElement).closest('.heatmap-wrapper');
    if (wrapper) {
      const wrapperRect = wrapper.getBoundingClientRect();
      setTooltip({
        date: cell.date,
        count: cell.count,
        x: rect.left - wrapperRect.left + rect.width / 2,
        y: rect.top - wrapperRect.top,
      });
    }
  };

  const handleCellLeave = () => {
    setTooltip(null);
  };

  const handleTouchStart = (e: React.TouchEvent, cell: HeatmapData) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const wrapper = (e.currentTarget as HTMLElement).closest('.heatmap-wrapper');
    if (wrapper) {
      const wrapperRect = wrapper.getBoundingClientRect();
      setTooltip({
        date: cell.date,
        count: cell.count,
        x: rect.left - wrapperRect.left + rect.width / 2,
        y: rect.top - wrapperRect.top,
      });
    }
  };

  const handleTouchEnd = () => {
    setTimeout(() => setTooltip(null), 2000);
  };

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
    <div className="card overflow-hidden">
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

      <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div
          className="heatmap-wrapper relative inline-block"
          style={{ minWidth: `${totalCols * COL_STEP + 24}px` }}
        >
          {/* 月份标签 */}
          <div className="flex mb-1" style={{ paddingLeft: '24px' }}>
            <div className="relative" style={{ height: '16px', width: `${totalCols * COL_STEP}px` }}>
              {monthLabels.map((ml, i) => (
                <span
                  key={i}
                  className="absolute text-[10px] text-primary-600 dark:text-primary-400"
                  style={{ left: `${ml.col * COL_STEP}px` }}
                >
                  {ml.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex">
            {/* 星期标签 */}
            <div className="flex flex-col mr-1.5" style={{ gap: `${CELL_GAP}px`, paddingTop: '2px' }}>
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="text-[9px] text-primary-400 dark:text-primary-500 flex items-center"
                  style={{ height: `${CELL_SIZE}px`, width: '20px' }}
                >
                  {i % 2 === 0 ? label : ''}
                </div>
              ))}
            </div>

            {/* 格子 */}
            <div className="flex" style={{ gap: `${CELL_GAP}px` }}>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col" style={{ gap: `${CELL_GAP}px` }}>
                  {week.map((cell, di) => {
                    if (!cell) {
                      return (
                        <div
                          key={di}
                          style={{
                            width: `${CELL_SIZE}px`,
                            height: `${CELL_SIZE}px`,
                            backgroundColor: 'transparent',
                          }}
                        />
                      );
                    }
                    const isToday = cell.date === todayStr;
                    return (
                      <div
                        key={di}
                        className="heatmap-cell relative cursor-pointer"
                        style={{
                          width: `${CELL_SIZE}px`,
                          height: `${CELL_SIZE}px`,
                          backgroundColor: getColor(cell.level),
                          border: cell.level === 0
                            ? '1px solid ' + (darkMode ? '#4d7c0f' : '#d9f99d')
                            : isToday
                              ? '2px solid #65a30d'
                              : 'none',
                          outline: isToday ? '1px solid #65a30d' : 'none',
                        }}
                        onMouseEnter={(e) => handleCellEnter(e, cell)}
                        onMouseLeave={handleCellLeave}
                        onTouchStart={(e) => handleTouchStart(e, cell)}
                        onTouchEnd={handleTouchEnd}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Tooltip - 渲染在格子外部，避免鼠标事件干扰 */}
            {tooltip && (
              <div
                className="heatmap-tooltip pointer-events-none"
                style={{
                  left: `${tooltip.x}px`,
                  top: `${tooltip.y - 10}px`,
                }}
              >
                <div className="font-medium">{tooltip.date}</div>
                <div>{tooltip.count} 次打卡</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}