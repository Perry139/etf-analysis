/* ============ 头部管理人对比分析 ============ */
(function () {
  "use strict";

  var D = window.ETF_DATA || {};
  var M = D.managers || window.ETF_MANAGERS || {};
  var MANAGERS = ["易方达基金", "华夏基金", "国泰基金", "华泰柏瑞基金"];
  var CAT1_LABEL = { 股票: "权益", 商品: "商品", 债券: "债券", 货币: "货币" };
  var CAT1_ORDER = ["股票", "商品", "债券", "货币"];
  var CAT2_ORDER = ["宽基", "行业", "主题", "风格因子"];
  // 行业/主题细分统一顺序（按规模降序动态调整）
  var IND_SUBS = ["科技", "制造", "医药", "周期", "金融", "消费", "公用事业", "其他"];
  var THM_SUBS = ["数字化与人工智能", "低碳转型", "高端制造", "大健康", "大消费", "国企改革", "其他"];

  // 细分赛道映射（按跟踪指数名 + sub 关键词）
  // 数组顺序 = 表格展示顺序：权益(宽基A股→港股→国际/其他→行业→主题→风格因子) → 债券 → 商品 → 货币
  var TRACK_RULES = [
    { name: "宽基-大盘", cat: ["股票"], cat2: ["宽基"], keys: ["沪深300", "上证50", "上证180", "A50", "中证100", "深证100", "A100", "MSCI中国A50", "中证A500"] },
    { name: "宽基-中盘", cat: ["股票"], cat2: ["宽基"], keys: ["中证500", "中证800", "上证中盘", "MSCIA股"] },
    { name: "宽基-小盘", cat: ["股票"], cat2: ["宽基"], keys: ["中证1000", "中证2000", "小盘"] },
    { name: "宽基-创业板", cat: ["股票"], cat2: ["宽基"], keys: ["创业板"] },
    { name: "宽基-科创板", cat: ["股票"], cat2: ["宽基"], keys: ["科创50", "科创100", "科创200", "科创综指", "科创创业"] },
    { name: "港股", cat: ["股票"], cat2: ["宽基", "行业", "主题", "风格因子"], keys: ["恒生", "港股通", "中证香港", "香港", "沪港深"] },
    { name: "外国", cat: ["股票"], cat2: ["宽基"], keys: ["纳斯达克", "标普", "日经", "DAX", "CAC", "MSCI美国", "美国50", "富时", "TOPIX", "东证"] },
    { name: "增厚（指数增强）", cat: ["股票"], cat2: ["宽基"], keys: ["增强"] },
    { name: "行业-金融", cat: ["股票"], cat2: ["行业"], keys: ["证券", "银行", "保险", "金融", "非银行金融"] },
    { name: "行业-科技-半导体/芯片", cat: ["股票"], cat2: ["行业"], keys: ["半导体", "芯片"] },
    { name: "行业-科技-AI/软件/互联网", cat: ["股票"], cat2: ["行业"], keys: ["人工智能", "软件", "互联网", "云计算", "数字", "信息安全", "物联网", "信创", "科技", "信息"] },
    { name: "行业-消费", cat: ["股票"], cat2: ["行业"], keys: ["消费", "食品", "饮料", "家电", "旅游", "传媒", "酒", "零售", "农林"] },
    { name: "行业-医药", cat: ["股票"], cat2: ["行业"], keys: ["医药", "医疗", "生物", "创新药", "医疗器械", "中药", "健康", "卫生"] },
    { name: "行业-新能源/低碳", cat: ["股票"], cat2: ["行业"], keys: ["新能源", "光伏", "电池", "储能", "绿电", "碳中和", "低碳", "能源"] },
    { name: "行业-军工/国防", cat: ["股票"], cat2: ["行业"], keys: ["军工", "国防", "兵装", "航空", "航天"] },
    { name: "行业-有色/黄金", cat: ["股票"], cat2: ["行业"], keys: ["有色", "黄金", "矿业", "稀土", "贵金属"] },
    { name: "行业-周期-化工/资源", cat: ["股票"], cat2: ["行业"], keys: ["化工", "石油", "煤炭", "钢铁", "石化", "建材", "大宗", "油气", "资源"] },
    { name: "行业-制造", cat: ["股票"], cat2: ["行业"], keys: ["制造", "机械", "工业", "装备", "汽车", "家电", "通信", "电力", "交运"] },
    { name: "行业-公用事业", cat: ["股票"], cat2: ["行业"], keys: ["公用事业", "电力", "电网", "环保", "水务", "绿电"] },
    { name: "主题-AI/数字化", cat: ["股票"], cat2: ["主题"], keys: ["数字化", "人工智能", "信创", "数字经济", "信息安全", "物联网", "软件", "互联网", "云"] },
    { name: "主题-大健康", cat: ["股票"], cat2: ["主题"], keys: ["大健康", "创新药", "医疗", "生物", "中药", "医药", "健康"] },
    { name: "主题-高端制造/机器人", cat: ["股票"], cat2: ["主题"], keys: ["高端制造", "机器人", "智能汽车", "装备", "工业", "通用航空", "航空航天", "制造", "军工"] },
    { name: "主题-低碳/新能源", cat: ["股票"], cat2: ["主题"], keys: ["低碳", "新能源", "光伏", "电池", "储能", "碳中和", "能源", "绿色", "新能源车"] },
    { name: "主题-大消费", cat: ["股票"], cat2: ["主题"], keys: ["大消费", "消费", "食品", "饮料", "农业", "传媒", "家电"] },
    { name: "主题-国企改革/综合", cat: ["股票"], cat2: ["主题"], keys: ["国企", "央企", "改革", "一带一路", "综合科技", "ESG", "综合"] },
    { name: "风格因子-红利", cat: ["股票"], cat2: ["风格因子"], keys: ["红利", "高股息", "低波"] },
    { name: "风格因子-价值", cat: ["股票"], cat2: ["风格因子"], keys: ["价值"] },
    { name: "风格因子-成长", cat: ["股票"], cat2: ["风格因子"], keys: ["成长"] },
    { name: "风格因子-自由现金流", cat: ["股票"], cat2: ["风格因子"], keys: ["自由现金流", "现金流"] },
    { name: "债券", cat: ["债券"], cat2: ["债券"], keys: [] },
    { name: "商品", cat: ["商品"], cat2: ["商品"], keys: [] },
    { name: "货币", cat: ["货币"], cat2: ["货币"], keys: [] }
  ];

  function matchTrack(r) {
    var nm = (r.indexName || "") + "|" + (r.name || "");
    for (var i = 0; i < TRACK_RULES.length; i++) {
      var rule = TRACK_RULES[i];
      if (rule.cat.indexOf(r.cat1) < 0) continue;
      if (rule.cat2.indexOf(r.cat2) < 0) continue;
      if (rule.sub) {
        var subs = Array.isArray(rule.sub) ? rule.sub : [rule.sub];
        if (subs.indexOf(r.sub || "") < 0) continue;
      }
      if (!rule.keys || rule.keys.length === 0) return rule.name;
      for (var k = 0; k < rule.keys.length; k++) {
        if (nm.indexOf(rule.keys[k]) >= 0) return rule.name;
      }
    }
    return null;
  }

  var charts = {};
  var initialized = false;

  function list(m) { return M[m] || []; }
  function sumScale(rows) { return rows.reduce(function (s, r) { return s + (r.scaleYi || 0); }, 0); }
  function fmt(v) { return v == null ? "—" : (Math.round(Number(v) * 100) / 100).toLocaleString("zh-CN", { maximumFractionDigits: 2 }); }
  function fmt1(v) { return v == null ? "—" : (Math.round(Number(v) * 10) / 10).toLocaleString("zh-CN", { maximumFractionDigits: 1 }); }
  function pct(a, b) { return b ? (a / b * 100).toFixed(1) : "—"; }

  function byCat1(rows, c1) { return rows.filter(function (r) { return r.cat1 === c1; }); }
  function byCat2(rows, c2) { return rows.filter(function (r) { return r.cat1 === "股票" && r.cat2 === c2; }); }
  function bySub(rows, sub) { return rows.filter(function (r) { return (r.sub || "") === sub; }); }

  function topN(rows, n) {
    return rows.slice().sort(function (a, b) { return (b.scaleYi || 0) - (a.scaleYi || 0); }).slice(0, n);
  }

  // ---------- 概览卡 ----------
  function renderCards() {
    var html = MANAGERS.map(function (m) {
      var rows = list(m);
      var n = rows.length;
      var s = sumScale(rows);
      var eq = rows.filter(function (r) { return r.cat1 === "股票"; }).length;
      return '<div class="stat-card"><div class="k">' + m + '</div>' +
        '<div class="v">' + fmt1(s) + ' <small>亿</small></div>' +
        '<div class="sub2">' + n + " 只 · 权益 " + eq + " 只</div></div>";
    }).join("");
    document.getElementById("cmpCards").innerHTML = html;
  }

  // ---------- 一级分类对比（x=分类，series=四家，规模） ----------
  function renderCat1Chart() {
    var cats = CAT1_ORDER.map(function (c) { return CAT1_LABEL[c]; });
    var series = MANAGERS.map(function (m, i) {
      var rows = list(m);
      return {
        name: m,
        type: "bar",
        barMaxWidth: 26,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        data: CAT1_ORDER.map(function (c) { return +sumScale(byCat1(rows, c)).toFixed(2); })
      };
    });
    charts.cmpCat1 = echarts.init(document.getElementById("cmpCat1Chart"));
    charts.cmpCat1.setOption({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: function (v) { return fmt(v) + " 亿"; } },
      legend: { top: 6, textStyle: { fontSize: 12, color: "#5c6b84" } },
      grid: { left: 56, right: 20, top: 44, bottom: 30 },
      xAxis: { type: "category", data: cats, axisLabel: { fontSize: 12 } },
      yAxis: { type: "value", name: "规模(亿元)", nameTextStyle: { fontSize: 11 }, axisLabel: { fontSize: 11 } },
      series: series
    }, true);
  }

  // ---------- 权益二级分类对比 ----------
  function renderCat2Chart() {
    var series = MANAGERS.map(function (m, i) {
      var rows = list(m);
      return {
        name: m,
        type: "bar",
        barMaxWidth: 26,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        data: CAT2_ORDER.map(function (c) { return +sumScale(byCat2(rows, c)).toFixed(2); })
      };
    });
    charts.cmpCat2 = echarts.init(document.getElementById("cmpCat2Chart"));
    charts.cmpCat2.setOption({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: function (v) { return fmt(v) + " 亿"; } },
      legend: { top: 6, textStyle: { fontSize: 12, color: "#5c6b84" } },
      grid: { left: 56, right: 20, top: 44, bottom: 30 },
      xAxis: { type: "category", data: CAT2_ORDER, axisLabel: { fontSize: 12 } },
      yAxis: { type: "value", name: "规模(亿元)", nameTextStyle: { fontSize: 11 }, axisLabel: { fontSize: 11 } },
      series: series
    }, true);
  }

  // ---------- 大单品 TOP3 表 ----------
  var TOP_GROUPS = [
    { label: "权益·宽基", filter: function (r) { return r.cat1 === "股票" && r.cat2 === "宽基"; } },
    { label: "权益·行业", filter: function (r) { return r.cat1 === "股票" && r.cat2 === "行业"; } },
    { label: "权益·主题", filter: function (r) { return r.cat1 === "股票" && r.cat2 === "主题"; } },
    { label: "权益·风格因子", filter: function (r) { return r.cat1 === "股票" && r.cat2 === "风格因子"; } },
    { label: "商品", filter: function (r) { return r.cat1 === "商品"; } },
    { label: "债券", filter: function (r) { return r.cat1 === "债券"; } },
    { label: "货币", filter: function (r) { return r.cat1 === "货币"; } }
  ];

  function renderTopTable() {
    var html = "";
    MANAGERS.forEach(function (m) {
      var rows = list(m);
      TOP_GROUPS.forEach(function (g) {
        var t = topN(rows.filter(g.filter), 3);
        if (!t.length) return;
        html += "<tr><td>" + m + "</td><td>" + g.label.split("·")[0] + "</td><td>" + (g.label.split("·")[1] || "") + "</td>";
        for (var i = 0; i < 3; i++) {
          if (t[i]) {
            html += "<td>" + t[i].name + "</td><td class='num'>" + fmt(t[i].scaleYi) + " 亿</td>";
          } else {
            html += "<td>—</td><td class='num'>—</td>";
          }
        }
        html += "</tr>";
      });
    });
    document.getElementById("cmpTopTbody").innerHTML = html;
  }

  // ---------- 领先/落后分析 ----------
  function renderLeadGrid() {
    var html = "";
    var items = [
      { title: "权益 · 宽基", rows: function (m) { return byCat2(list(m), "宽基"); } },
      { title: "权益 · 行业", rows: function (m) { return byCat2(list(m), "行业"); } },
      { title: "权益 · 主题", rows: function (m) { return byCat2(list(m), "主题"); } },
      { title: "权益 · 风格因子", rows: function (m) { return byCat2(list(m), "风格因子"); } },
      { title: "商品", rows: function (m) { return byCat1(list(m), "商品"); } },
      { title: "债券", rows: function (m) { return byCat1(list(m), "债券"); } },
      { title: "货币", rows: function (m) { return byCat1(list(m), "货币"); } }
    ];
    items.forEach(function (it) {
      var rank = MANAGERS.map(function (m) {
        return { m: m, s: sumScale(it.rows(m)), n: it.rows(m).length };
      }).sort(function (a, b) { return b.s - a.s; });
      var total = rank.reduce(function (s, x) { return s + x.s; }, 0);
      var ef = null, first = rank[0];
      rank.forEach(function (x, i) { if (x.m === "易方达基金") ef = { rank: i + 1, s: x.s, n: x.n }; });
      var gap = first && ef ? ((first.s - ef.s) / (first.s || 1) * 100).toFixed(1) : null;
      var isFirst = ef && ef.rank === 1;
      html += '<div class="lead-card">' +
        '<div class="lead-title">' + it.title + '</div>' +
        '<div class="lead-row"><span class="lead-k">第一名</span><span class="lead-v">' + first.m + ' · ' + fmt1(first.s) + ' 亿</span></div>' +
        '<div class="lead-row"><span class="lead-k">易方达</span><span class="lead-v ' + (isFirst ? "ok" : "no") + '">第 ' + (ef ? ef.rank : "—") + ' 名 · ' + fmt1(ef ? ef.s : 0) + ' 亿' +
        (isFirst ? "（领先）" : (gap != null ? "（落后第一名 " + gap + "%）" : "")) + '</span></div>' +
        '<div class="lead-row"><span class="lead-k">四家合计</span><span class="lead-v">' + fmt1(total) + ' 亿</span></div>' +
        '<div class="lead-bar"><div class="lead-bar-in" style="width:' + (total ? (rank[0].s / total * 100).toFixed(1) : 0) + '%"></div></div>' +
        "</div>";
    });
    document.getElementById("cmpLeadGrid").innerHTML = html;
  }

  // ---------- 细分赛道对比（按自定义行业/主题子赛道） ----------
  function renderTrackAnalysis() {
    var byMgr = {};
    MANAGERS.forEach(function (m) { byMgr[m] = list(m); });

    var html = "";
    TRACK_RULES.forEach(function (rule) {
      var byMgrS = {};
      var byMgrTop = {};
      var byMgrPool = {};
      var total = 0;
      MANAGERS.forEach(function (m) {
        var pool = byMgr[m].filter(function (r) {
          if (rule.cat.indexOf(r.cat1) < 0) return false;
          if (rule.cat2.indexOf(r.cat2) < 0) return false;
          if (rule.sub) {
            var subs = Array.isArray(rule.sub) ? rule.sub : [rule.sub];
            if (subs.indexOf(r.sub || "") < 0) return false;
          }
          if (rule.keys && rule.keys.length) {
            var nm = (r.indexName || "") + "|" + (r.name || "");
            for (var k = 0; k < rule.keys.length; k++) {
              if (nm.indexOf(rule.keys[k]) >= 0) return true;
            }
            return false;
          }
          return true;
        });
        byMgrPool[m] = pool;
        byMgrS[m] = sumScale(pool);
        byMgrTop[m] = pool.slice().sort(function (a, b) { return (b.scaleYi || 0) - (a.scaleYi || 0); })[0] || null;
        total += byMgrS[m];
      });
      if (total === 0) return;

      function cell(m) {
        var s = byMgrS[m] || 0;
        var t = byMgrTop[m];
        if (!s) return "—";
        return fmt1(s) + ' 亿' + (t ? '<br><span class="track-top">' + t.name + ' ' + fmt(t.scaleYi) + '</span>' : '');
      }

      // ---- 立体对比分析文字 ----
      var rankArr = MANAGERS.map(function (m) { return { m: m, s: byMgrS[m] }; }).sort(function (a, b) { return b.s - a.s; });
      var tip = [];
      // 格局（排名）
      var rankText = rankArr.map(function (x, i) {
        return "第" + (i + 1) + " " + x.m + " " + fmt1(x.s) + "亿";
      }).join("；");
      tip.push("格局：" + rankText);
      // 易方达定位
      var efS = byMgrS["易方达基金"] || 0;
      var efRank = rankArr.findIndex(function (x) { return x.m === "易方达基金"; }) + 1;
      var efPct = total ? (efS / total * 100).toFixed(0) : 0;
      var lead = "易方达第" + efRank + "（" + fmt1(efS) + "亿，占该赛道" + efPct + "%）";
      if (efRank === 1) {
        lead += "，居首";
      } else if (rankArr[0].s > 0) {
        var gap = rankArr[0].s - efS;
        if (gap > 1) lead += "，落后第一名" + fmt1(gap) + "亿";
      }
      tip.push(lead);
      // vs 华夏
      var cmS = byMgrS["华夏基金"] || 0;
      if (efS > 0 && cmS > 0) {
        var d = efS - cmS;
        if (Math.abs(d) > 5) tip.push("vs华夏：" + (d > 0 ? "领先" + fmt1(d) + "亿" : "落后" + fmt1(-d) + "亿"));
      }
      // 大单品 TOP2
      var topTexts = [];
      MANAGERS.forEach(function (m) {
        if (!byMgrS[m]) return;
        var t2 = byMgrPool[m].slice().sort(function (a, b) { return (b.scaleYi || 0) - (a.scaleYi || 0); }).slice(0, 2);
        var names = t2.map(function (x) { return x.name + "(" + fmt(x.scaleYi) + "亿)"; }).join("、");
        topTexts.push(m + "：" + (names || "—"));
      });
      if (topTexts.length) tip.push("大单品：" + topTexts.join("；"));
      // 未布局
      var noEx = MANAGERS.filter(function (m) { return byMgrS[m] === 0; });
      if (noEx.length) tip.push(noEx.join("、") + " 未布局该赛道");

      html += "<tr>" +
        '<td class="track-name">' + rule.name + "</td>" +
        '<td class="track-cell ef">' + cell("易方达基金") + "</td>" +
        '<td class="track-cell">' + cell("华夏基金") + "</td>" +
        '<td class="track-cell">' + cell("国泰基金") + "</td>" +
        '<td class="track-cell">' + cell("华泰柏瑞基金") + "</td>" +
        '<td class="track-tip">' + tip.join("<br>") + "</td>" +
        "</tr>";
    });
    document.getElementById("cmpTrackTbody").innerHTML = html;
  }

  function resizeAll() {
    Object.keys(charts).forEach(function (k) { charts[k].resize(); });
  }

  function init() {
    if (initialized) { resizeAll(); return; }
    initialized = true;
    renderCards();
    renderCat1Chart();
    renderCat2Chart();
    renderTopTable();
    renderLeadGrid();
    renderTrackAnalysis();
  }

  window.CMP_INIT = init;
})();
