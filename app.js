let lastCanvasId = null;


    let chart = null;

    async function load(type) {
  const statsRes = await fetch(`http://localhost:3000/api/stats/${type}`);
  const stats = await statsRes.json();
  document.getElementById('stats').innerText =
    `${type}：共 ${stats.stats.count} 条，` +
    `平均 ${stats.stats.avg.toFixed(2)}，` +
    `最高 ${stats.stats.max}，最低 ${stats.stats.min}，` +
    `范围 ${stats.stats.firstDate} ~ ${stats.stats.lastDate}`;

  const yearRes = await fetch(`http://localhost:3000/api/yearly/${type}`);
  const yearly = await yearRes.json();

  // ← 加这一行：过滤掉不完整的年份
  const data = yearly.data.filter(x => x.count >= 300);

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById('chart'), {
    type: 'line',
    data: {
      labels: data.map(x => x.year),        // ← 改成 data
      datasets: [
        {
          label: '年平均',
          data: data.map(x => x.avg),       // ← 改成 data
          borderColor: 'red',
          tension: 0.2,
        },
        {
          label: '年最高',
          data: data.map(x => x.max),       // ← 改成 data
          borderColor: 'orange',
          tension: 0.2,
        },
        {
          label: '年最低',
          data: data.map(x => x.min),       // ← 改成 data
          borderColor: 'blue',
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: type + ' 年度趋势' },
      },
    },
  });

  lastCanvasId = 'chart';
}

let cumChart = null;

async function loadCumulative() {
  const year = prompt('输入年份：', '2025');
  if (!year) return;

  const r = await fetch(`http://localhost:3000/api/cumulative/temperature/${year}`);
  const d = await r.json();

  if (cumChart) cumChart.destroy();

  cumChart = new Chart(document.getElementById('cumChart'), {
    type: 'line',
    data: {
      labels: d.data.map(x => x.month),
      datasets: [
        {
          label: `${year}年 月平均`,
          data: d.data.map(x => x.monthlyAvg),
          borderColor: 'blue',
          tension: 0.2,
        },
        {
          label: `${year}年 累积平均`,
          data: d.data.map(x => x.cumulativeAvg),
          borderColor: 'red',
          tension: 0.2,
        },
      ],
    },
    options: {
      plugins: {
        title: { display: true, text: `${year}年 温度累积平均` },
      },
    },
  });

  lastCanvasId = 'cumChart';
}

let peakChart = null;

async function loadPeak() {
  const r = await fetch('http://localhost:3000/api/peak-month/temperature');
  const d = await r.json();

  if (peakChart) peakChart.destroy();

  peakChart = new Chart(document.getElementById('peakChart'), {
    type: 'line',
    data: {
      labels: d.data.map(x => x.year),
      datasets: [{
        label: '峰值月',
        data: d.data.map(x => Number(x.peakMonth)),
        borderColor: 'purple',
        tension: 0.2,
      }],
    },
    options: {
      scales: {
        y: {
          min: 1,
          max: 12,
          ticks: { stepSize: 1 },
        },
      },
      plugins: {
        title: { display: true, text: '每年"1到x月平均"的峰值月' },
      },
    },
  });
  lastCanvasId = 'peakChart';
}


let monthChart = null;

async function loadMonthTrend() {
  const month = prompt('输入月份（1-12）：', '9');
  if (!month) return;

  const r = await fetch(`http://localhost:3000/api/monthly-trend/temperature/${month}`);
  const d = await r.json();

  if (monthChart) monthChart.destroy();

  monthChart = new Chart(document.getElementById('monthChart'), {
    type: 'line',
    data: {
      labels: d.data.map(x => x.year),
      datasets: [{
        label: `${month} 月平均温`,
        data: d.data.map(x => x.avg),
        borderColor: 'green',
        tension: 0.2,
      }],
    },
    options: {
      plugins: {
        title: { display: true, text: `${month} 月平均温逐年变化` },
      },
    },
  });

  lastCanvasId = 'monthChart';
}

let dailyChart = null;

async function loadDaily() {
  const year = prompt('年份：', '2024');
  if (!year) return;
  const month = prompt('月份：', '9');
  if (!month) return;

  const r = await fetch(`http://localhost:3000/api/daily/temperature/${year}/${month}`);
  const d = await r.json();

  if (dailyChart) dailyChart.destroy();

  dailyChart = new Chart(document.getElementById('dailyChart'), {
    type: 'line',
    data: {
      labels: d.data.map(x => x.date.slice(8)),  // 只显示"日"
      datasets: [{
        label: `${year}年${month}月 日均温`,
        data: d.data.map(x => x.value),
        borderColor: 'red',
        tension: 0.2,
      }],
    },
    options: {
      plugins: {
        title: { display: true, text: `${year}年${month}月 每日温度` },
      },
    },
  });

  lastCanvasId = 'dailyChart';
}

let hotChart = null;

async function loadHotDays() {
  const month = prompt('月份：', '9');
  if (!month) return;
  const threshold = prompt('日均温 ≥ 多少度算大幅偏高？', '30');
  if (!threshold) return;

  const r = await fetch(`http://localhost:3000/api/hot-days/temperature/${month}/${threshold}`);
  const d = await r.json();

  if (hotChart) hotChart.destroy();

  hotChart = new Chart(document.getElementById('hotChart'), {
    type: 'line',                    // ← 改成 line
    data: {
      labels: d.data.map(x => x.year),
      datasets: [{
        label: `${month}月 日均温≥${threshold}°C 的天数`,
        data: d.data.map(x => x.hotDays),
        borderColor: 'crimson',
        backgroundColor: 'crimson',
        tension: 0.2,
        pointRadius: 3,              // ← 每个点都画出来
      }],
    },
    options: {
      plugins: {
        title: { display: true, text: `${month}月大幅偏高天数逐年变化（日均温≥${threshold}°C）` },
      },
      scales: {
        y: { beginAtZero: true },    // ← Y 轴从 0 开始
      },
    },
  });

  lastCanvasId = 'hotChart';
}

let compareChart = null;

async function loadCompare() {
  const r = await fetch('http://localhost:3000/api/compare/steps-activity');
  const d = await r.json();

  if (compareChart) compareChart.destroy();

  const labels = d.data.map(x => x.activity === 1 ? '活动日' : '非活动日');

  compareChart = new Chart(document.getElementById('compareChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '平均步数',
        data: d.data.map(x => x.avgSteps),
        backgroundColor: ['gray', 'green'],
      }],
    },
    options: {
      plugins: {
        title: { display: true, text: '活动日 vs 非活动日：平均步数' },
      },
    },
  });

  lastCanvasId = 'compareChart';
}

let weekdayChart = null;

async function loadWeekday() {
  const type = prompt('类型（activity / steps / temperature）：', 'activity');
  if (!type) return;

  const r = await fetch(`http://localhost:3000/api/weekday/${type}`);
  const d = await r.json();

  if (weekdayChart) weekdayChart.destroy();

  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  weekdayChart = new Chart(document.getElementById('weekdayChart'), {
    type: 'bar',
    data: {
      labels: d.data.map(x => names[Number(x.weekday)]),
      datasets: [{
        label: `${type} 平均值`,
        data: d.data.map(x => x.avg),
        backgroundColor: 'steelblue',
      }],
    },
    options: {
      plugins: {
        title: { display: true, text: `${type} 按星期分布` },
      },
    },
  });

  lastCanvasId = 'weekdayChart';
}


let monthDistChart = null;

async function loadMonthDist() {
  const type = prompt('类型（activity / steps / temperature）：', 'activity');
  if (!type) return;

  const r = await fetch(`http://localhost:3000/api/month-dist/${type}`);
  const d = await r.json();

  if (monthDistChart) monthDistChart.destroy();

  const isActivity = type === 'activity';

  monthDistChart = new Chart(document.getElementById('monthDistChart'), {
    type: 'bar',
    data: {
      labels: d.data.map(x => x.month + '月'),
      datasets: [{
        label: isActivity ? '总次数' : '平均值',
        data: d.data.map(x => isActivity ? x.total : x.avg),
        backgroundColor: 'steelblue',
      }],
    },
    options: {
      plugins: {
        title: { display: true, text: `${type} 月度分布` },
      },
    },
  });

  lastCanvasId = 'monthDistChart';


}

async function loadDay() {
  const date = document.getElementById('dayInput').value;
  if (!date) return;

  const r = await fetch(`http://localhost:3000/api/day/${date}`);
  const d = await r.json();

  const data = d.data;
  const lines = [`日期：${data.date}`];
  if (data.temperature !== undefined) lines.push(`温度：${data.temperature}°C`);
  if (data.steps !== undefined) lines.push(`步数：${data.steps}`);
  if (data.activity !== undefined) lines.push(`活动：${data.activity} 次`);

  document.getElementById('dayResult').innerText = lines.join('\n');
}

async function loadTop() {
  const type = prompt('类型（temperature / steps / activity）：', 'temperature');
  if (!type) return;

  const r = await fetch(`http://localhost:3000/api/top/${type}`);
  const d = await r.json();

  const lines = d.data.map((x, i) => `${i + 1}. ${x.date} — ${x.value}`);
  document.getElementById('topResult').innerText = `${type} 前 10：\n` + lines.join('\n');
}


let maChart = null;

async function loadMovingAvg() {
  const type = prompt('类型：', 'temperature');
  if (!type) return;

  const defaultWindow = type === 'temperature' ? '5' : '7';
  const win = prompt('窗口（天数）：', defaultWindow);
  if (!win) return;

  const year = prompt('年份：', '2022');
  if (!year) return;

  const r = await fetch(`http://localhost:3000/api/moving-avg/${type}/${win}/${year}`);
  const d = await r.json();

  if (maChart) maChart.destroy();

  maChart = new Chart(document.getElementById('maChart'), {
    type: 'line',
    data: {
      labels: d.data.map(x => x.date),
      datasets: [
        {
          label: '原始',
          data: d.data.map(x => x.value),
          borderColor: 'rgba(200,200,200,0.8)',
          pointRadius: 0,
          tension: 0.2,
        },
        {
          label: `${win}天滑动平均`,
          data: d.data.map(x => x.avg),
          borderColor: 'red',
          pointRadius: 0,
          tension: 0.2,
        },
      ],
    },
    options: {
      plugins: {
        title: { display: true, text: `${type} ${year}年 ${win}天滑动平均` },
      },
    },
  });


  lastCanvasId = 'maChart';
}



async function loadCorrelation() {
  const t1 = prompt('第一个类型：', 'steps');
  if (!t1) return;
  const t2 = prompt('第二个类型：', 'temperature');
  if (!t2) return;

  const r = await fetch(`http://localhost:3000/api/correlation/${t1}/${t2}`);
  const d = await r.json();

  if (!d.ok) {
    alert(d.msg);
    return;
  }

  const desc = d.correlation > 0.5 ? '强正相关'
             : d.correlation > 0.3 ? '弱正相关'
             : d.correlation < -0.5 ? '强负相关'
             : d.correlation < -0.3 ? '弱负相关'
             : '几乎无关';

  document.getElementById('topResult').innerText =
    `${t1} vs ${t2}\n` +
    `样本数：${d.n}\n` +
    `相关系数：${d.correlation.toFixed(3)}\n` +
    `判断：${desc}`;
}


let sbtChart = null;

async function loadStepsByTemp() {
  const r = await fetch('http://localhost:3000/api/steps-by-temp');
  const d = await r.json();

  if (sbtChart) sbtChart.destroy();

  sbtChart = new Chart(document.getElementById('sbtChart'), {
    type: 'bar',
    data: {
      labels: d.data.map(x => `${x.tempBucket}~${x.tempBucket + 5}°C (${x.days}天)`),
      datasets: [{
        label: '平均步数',
        data: d.data.map(x => x.avgSteps),
        backgroundColor: 'steelblue',
      }],
    },
    options: {
      plugins: {
        title: { display: true, text: '不同温度下的平均步数' },
      },
    },
  });


  lastCanvasId = 'sbtChart';
}

let abtChart = null;

async function loadActivityByTemp() {
  const r = await fetch('http://localhost:3000/api/activity-by-temp');
  const d = await r.json();

  if (abtChart) abtChart.destroy();

  abtChart = new Chart(document.getElementById('abtChart'), {
    type: 'bar',
    data: {
      labels: d.data.map(x => `${x.tempBucket}~${x.tempBucket + 5}°C (${x.days}天)`),
      datasets: [{
        label: '活动率',
        data: d.data.map(x => x.avgActivity),
        backgroundColor: 'coral',
      }],
    },
    options: {
      plugins: {
        title: { display: true, text: '不同温度下的活动率' },
      },
    },
  });

lastCanvasId = 'abtChart';

}

let seasonChart = null;

async function loadSeason() {
  const summerStd = Number(prompt('夏季标准（日均温 ≥ 多少度算夏天）：', '25'));
  if (!summerStd || summerStd > 28) {
    alert('夏季标准不能高于 28');
    return;
  }

  const winterStd = Number(prompt('冬季标准（日均温 < 多少度算冬天）：', '12'));
  if (!winterStd || winterStd > 15) {
    alert('冬季标准不能高于 15');
    return;
  }

  if (winterStd >= summerStd) {
    alert('冬季标准必须低于夏季标准');
    return;
  }

  // 一次拿所有年份
  const r = await fetch(`http://localhost:3000/api/season-all?summer=${summerStd}&winter=${winterStd}`);
  const d = await r.json();

  if (seasonChart) seasonChart.destroy();

  seasonChart = new Chart(document.getElementById('seasonChart'), {
    type: 'line',
    data: {
      labels: d.data.map(x => x.year),
      datasets: [
        {
          label: `夏天（≥${summerStd}°C）`,
          data: d.data.map(x => x.summer),
          borderColor: 'red',
          tension: 0.2,
        },
        {
          label: `冬天（<${winterStd}°C）`,
          data: d.data.map(x => x.winter),
          borderColor: 'blue',
          tension: 0.2,
        },
      ],
    },
    options: {
      plugins: {
        title: { display: true, text: `每年夏天（≥${summerStd}°C）/ 冬天（<${winterStd}°C）天数` },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });

  lastCanvasId = 'seasonChart';
}


function exportCanvas(id) {
  const source = document.getElementById(id);
  if (!source) return;

  // 新建一个 canvas，填白底
  const temp = document.createElement('canvas');
  temp.width = source.width;
  temp.height = source.height;
  const ctx = temp.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, temp.width, temp.height);
  ctx.drawImage(source, 0, 0);

  const link = document.createElement('a');
  link.download = id + '.png';
  link.href = temp.toDataURL('image/png');
  link.click();
}


function exportLast() {
  if (!lastCanvasId) {
    alert('还没有图，先点一个画图按钮');
    return;
  }
  exportCanvas(lastCanvasId);
}

function exportCanvas(id) {
  const source = document.getElementById(id);
  if (!source) return;

  const temp = document.createElement('canvas');
  temp.width = source.width;
  temp.height = source.height;
  const ctx = temp.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, temp.width, temp.height);
  ctx.drawImage(source, 0, 0);

  const link = document.createElement('a');
  link.download = id + '.png';
  link.href = temp.toDataURL('image/png');
  link.click();
}

async function uploadExcel() {
  const type = document.getElementById('uploadType').value;
  const fileInput = document.getElementById('uploadFile');
  const file = fileInput.files[0];

  if (!file) {
    alert('请先选文件');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  document.getElementById('uploadResult').innerText = '上传中…';

  const r = await fetch(`http://localhost:3000/api/upload/${type}`, {
    method: 'POST',
    body: formData,
  });

  const d = await r.json();

  if (d.ok) {
    document.getElementById('uploadResult').innerText = `成功导入 ${d.count} 条`;
  } else {
    document.getElementById('uploadResult').innerText = '失败：' + d.msg;
  }
}

    load('temperature');


    async function loadCalendar(type) {
  const r = await fetch(`http://localhost:3000/api/calendar/${type}`);
  const d = await r.json();
  
  const container = document.getElementById('calendarGrid');
  // 把原来的网格布局删掉，改成块级布局
  container.style.display = 'flex';
  container.style.flexWrap = 'wrap';
  container.style.gap = '20px';
  container.innerHTML = '';
  
  const dict = {};
  d.data.forEach(item => dict[item.date] = item.status);

  const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // 为每个月创建一个区块
  for (let m = 1; m <= 12; m++) {
    const monthBox = document.createElement('div');
    monthBox.innerHTML = `<div style="font-weight:bold; margin-bottom:5px; font-size:14px;">${monthNames[m-1]}</div>`;
    
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(7, 16px)'; // 7 列，每个 16px
    grid.style.gap = '3px';

    for (let day = 1; day <= daysInMonth[m - 1]; day++) {
      const mm = String(m).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const key = `${mm}-${dd}`;
      const status = dict[key] || 'normal';
      
      const cell = document.createElement('div');
      cell.style.width = '16px';
      cell.style.height = '16px';
      cell.style.borderRadius = '3px';
      cell.title = `${m}月${day}日`;
      
      if (status === 'always') cell.style.background = '#ffd700'; // 金色
      else if (status === 'never') cell.style.background = '#dc143c'; // 红色
      else cell.style.background = '#e0e0e0'; // 灰色
      
      grid.appendChild(cell);
    }
    monthBox.appendChild(grid);
    container.appendChild(monthBox);
  }
}

let gapChart = null;

async function loadSlidingGap() {
  const type = 'activity'; 
  const win = 30; // 30天窗口
  const year = prompt('输入年份（如 2025）：', '2025');
  if (!year) return;

  const r = await fetch(`http://localhost:3000/api/sliding-gap/${type}/${win}/${year}`);
  const d = await r.json();

  if (gapChart) gapChart.destroy();

  gapChart = new Chart(document.getElementById('gapChart'), {
    type: 'line',
    data: {
      labels: d.data.map(x => x.date.slice(5)), // 只显示 月-日
      datasets: [{
        label: '克制度（天数/次，越高越克制）',
        data: d.data.map(x => x.gap),
        borderColor: 'purple',
        backgroundColor: 'rgba(128, 0, 128, 0.1)',
        fill: true,
        tension: 0.2,
        pointRadius: 0, // 点太多就不画点了
      }],
    },
    options: {
      plugins: {
        title: { display: true, text: `${year}年 滑动克制度（30天窗口，封顶60）` },
      },
      scales: {
        y: { 
          beginAtZero: true,
          max: 65, // Y轴封顶稍微高一点点，留点空间
          title: { display: true, text: '天数/次（越高越克制）' }
        }
      }
    },
  });
  
  lastCanvasId = 'gapChart'; // 方便导出图片
}

async function showStreakBoard() {
  const r = await fetch('http://localhost:3000/api/streaks/activity');
  const d = await r.json();
  
  let html = `<h3 style="margin-top:0; color:#b8860b;">🏆 最高连击：${d.maxStreak.days} 天</h3>`;
  html += `<h3 style="margin-top:10px;">🧘‍♂️ 历史修仙 Top 10</h3>`;
  html += `<table style="width:100%; text-align:left; border-collapse:collapse; margin-top:10px;">`;
  html += `<tr style="background:#f0f0f0;"><th>名次</th><th>天数</th><th>起始日期</th><th>结束日期</th></tr>`;
  
  d.top10Gaps.forEach((g, i) => {
    html += `<tr style="border-bottom:1px solid #ccc;">
      <td>${i + 1}</td>
      <td style="font-weight:bold; color:purple;">${g.days} 天</td>
      <td>${g.startDate}</td>
      <td>${g.endDate}</td>
    </tr>`;
  });
  html += `</table>`;
  
  // 假设你有一个 id 为 'topResult' 的 div 用来显示结果
  const target = document.getElementById('topResult');
  if (target) {
    target.innerHTML = html;
  } else {
    // 如果页面没这个 div，就弹窗
    alert(`最高连击：${d.maxStreak.days}天\n最长修仙：${d.top10Gaps[0].days}天 (${d.top10Gaps[0].startDate} 到 ${d.top10Gaps[0].endDate})`);
  }
}

let stepActivityChart = null;

async function loadActivityBySteps() {
  const r = await fetch('http://localhost:3000/api/activity-by-steps');
  const d = await r.json();

  if (stepActivityChart) stepActivityChart.destroy();

  stepActivityChart = new Chart(document.getElementById('stepActivityChart'), {
    type: 'line', // 用折线图更能体现“阈值效应”
    data: {
      labels: d.data.map(x => x.range),
      datasets: [
        {
          label: '活动概率（活动天数 / 总天数）',
          data: d.data.map(x => x.activityRate),
          borderColor: 'crimson',
          backgroundColor: 'rgba(220, 20, 60, 0.2)',
          fill: true,
          tension: 0.2,
          pointRadius: 4,
          yAxisID: 'y', // 绑定左轴
        },
        {
          label: '样本天数（柱状）',
          data: d.data.map(x => x.totalDays),
          type: 'bar',
          backgroundColor: 'rgba(100, 100, 100, 0.3)',
          yAxisID: 'y1', // 绑定右轴（因为天数可能很大，和概率 0-1 不匹配）
        }
      ],
    },
    options: {
      plugins: {
        title: { display: true, text: '步数区间 vs 活动概率（交叉分析）' },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 1,
          title: { display: true, text: '活动概率 (0~1)' },
          ticks: { callback: v => (v * 100) + '%' }
        },
        y1: {
          position: 'right',
          beginAtZero: true,
          title: { display: true, text: '样本天数' },
          grid: { drawOnChartArea: false } // 避免网格线重叠
        }
      }
    }
  });

  lastCanvasId = 'stepActivityChart';
}

let wanbuChart = null;
async function loadMonthlyWanbu() {
  const r = await fetch('http://localhost:3000/api/monthly-wanbu');
  const d = await r.json();

  if (wanbuChart) wanbuChart.destroy();

  wanbuChart = new Chart(document.getElementById('wanbuChart'), {
    type: 'bar',
    data: {
      labels: d.data.map(x => x.month),
      datasets: [{
        label: '万步日天数',
        data: d.data.map(x => x.wanbu_days),
        backgroundColor: 'steelblue',
      }]
    },
    options: {
      plugins: {
        title: { display: true, text: '每月万步日天数' },
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
  lastCanvasId = 'wanbuChart';
}

let activity10Chart = null;
async function loadYearly10Activity() {
  const r = await fetch('http://localhost:3000/api/yearly-10activity');
  const d = await r.json();

  if (activity10Chart) activity10Chart.destroy();

  activity10Chart = new Chart(document.getElementById('activity10Chart'), {
    type: 'bar',
    data: {
      labels: d.data.map(x => x.year + '年'),
      datasets: [{
        label: '十啾月数量',
        data: d.data.map(x => x.months_reached_10),
        backgroundColor: 'crimson',
      }]
    },
    options: {
      plugins: {
        title: { display: true, text: '每年十啾月数量' },
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
  lastCanvasId = 'activity10Chart';
}