/* ============ 市场竞争格局与生态位分析 ============ */
(function () {
  "use strict";

  var D = window.ETF_DATA || {};
  var MM = D.marketManagers || {};
  var ALL_MGRS = Object.keys(MM);

  var ALL_ROWS = [];
  ALL_MGRS.forEach(function (m) {
    (MM[m] || []).forEach(function (r) {
      if (r.scaleYi == null) r.scaleYi = 0;
      ALL_ROWS.push({ owner: m, code: r.code, name: r.name, cat1: r.cat1, cat2: r.cat2, sub: r.sub, indexName: r.indexName || "", scaleYi: r.scaleYi });
    });
  });

  var TYPE_DEFS = {
    broad:          { label: "宽基", cat1: "股票", cat2: ["宽基"], title: "宽基类" },
    industry_theme: { label: "行业+主题", cat1: "股票", cat2: ["行业", "主题"], title: "行业+主题类" },
    factor:         { label: "风格因子", cat1: "股票", cat2: ["风格因子"], title: "风格因子类" },
    bond:           { label: "债券", cat1: "债券", cat2: ["债券"], title: "债券类" },
    commodity:      { label: "商品", cat1: "商品", cat2: ["商品"], title: "商品类" },
    currency:       { label: "货币", cat1: "货币", cat2: ["货币"], title: "货币类" }
  };

  function fmt(v) { return v == null ? "—" : Number(v).toLocaleString("zh-CN", { maximumFractionDigits: 2 }); }
  function sum(rows) { return rows.reduce(function (s, r) { return s + (r.scaleYi || 0); }, 0); }
  function topN(rows, n) {
    return rows.slice().sort(function (a, b) { return (b.scaleYi || 0) - (a.scaleYi || 0); }).slice(0, n);
  }
  function tier(s) { return s >= 300 ? "大单品" : s >= 100 ? "中单品" : "小单品"; }
  function fmtList(rows, maxN) {
    if (!rows || !rows.length) return "";
    var n = maxN || 5;
    return rows.slice(0, n).map(function (r) { return r.name; }).join("、") + (rows.length > n ? " 等" : "");
  }
  function fmtSizeBands(rows) {
    var big = [], mid = [], sm = [];
    rows.forEach(function (r) {
      var s = r.scaleYi || 0;
      if (s >= 300) big.push(r);
      else if (s >= 100) mid.push(r);
      else sm.push(r);
    });
    return { big: big, mid: mid, sm: sm };
  }

  // 断档阈值选头部：size[N]/size[N-1] < 0.5 停止；最小规模 < 10 亿停止；5~15 家
  function pickHead(ranks) {
    if (ranks.length <= 5) return ranks.slice();
    var out = [ranks[0]];
    for (var i = 1; i < ranks.length && i < 15; i++) {
      var prev = ranks[i - 1].s, cur = ranks[i].s;
      if (cur < 10) break;
      if (out.length >= 5 && prev > 0 && cur / prev < 0.5) break;
      out.push(ranks[i]);
    }
    return out;
  }

  function buildData(typeKey) {
    var def = TYPE_DEFS[typeKey] || TYPE_DEFS.broad;
    var pool = ALL_ROWS.filter(function (r) {
      if (def.cat1 && r.cat1 !== def.cat1) return false;
      if (def.cat2 && def.cat2.indexOf(r.cat2) < 0) return false;
      return true;
    });

    var ranks = ALL_MGRS.map(function (m) {
      var rows = pool.filter(function (r) { return r.owner === m; });
      var s = sum(rows);
      var t = rows.length ? topN(rows, 1)[0] : null;
      return { m: m, scale: s, count: rows.length, top: t };
    }).filter(function (r) { return r.scale > 0; })
      .sort(function (a, b) { return b.scale - a.scale; });

    var head = pickHead(ranks);

    var idxMap = {};
    pool.forEach(function (r) {
      var key = r.indexName || "";
      if (!key) return;
      idxMap[key] = idxMap[key] || { scale: 0, count: 0, topMgr: "", topName: "", topScale: 0 };
      idxMap[key].scale += r.scaleYi || 0;
      idxMap[key].count += 1;
      if ((r.scaleYi || 0) > idxMap[key].topScale) {
        idxMap[key].topScale = r.scaleYi || 0;
        idxMap[key].topName = r.name;
        idxMap[key].topMgr = r.owner;
      }
    });
    var indexes = Object.keys(idxMap).map(function (k) {
      return { indexName: k, scale: idxMap[k].scale, count: idxMap[k].count, topMgr: idxMap[k].topMgr || "—", topName: idxMap[k].topName, topScale: idxMap[k].topScale };
    }).sort(function (a, b) { return b.scale - a.scale; }).slice(0, 20);

    var efRow = ranks.find(function (r) { return r.m === "易方达基金"; });
    var efRank = efRow ? ranks.indexOf(efRow) + 1 : -1;

    return { typeKey: typeKey, def: def, pool: pool, ranks: ranks, head: head, indexes: indexes, efRow: efRow, efRank: efRank, total: sum(pool) };
  }

  function renderMgrTable(data) {
    var html = "";
    data.head.forEach(function (r, i) {
      var pct = data.total ? (r.scale / data.total * 100).toFixed(1) : 0;
      var barW = data.head[0].scale ? (r.scale / data.head[0].scale * 100).toFixed(1) : 0;
      var topName = r.top ? r.top.name : "—";
      var topScale = r.top ? fmt(r.top.scaleYi) : "—";
      var isEf = r.m === "易方达基金";
      var isLead = i === 0;
      html += "<tr" + (isEf ? ' class="highlight"' : "") + ">" +
        '<td class="rank">' + (i + 1) + (isLead ? ' <span class="crown">★</span>' : "") + "</td>" +
        "<td>" + r.m + "</td>" +
        '<td class="num">' + fmt(r.scale) + "</td>" +
        '<td class="num">' + r.count + "</td>" +
        '<td class="num">' + pct + "%</td>" +
        '<td><div class="mgr-bar"><div class="mgr-bar-in" style="width:' + barW + '%"></div></div>' +
        '<div class="mgr-top">' + topName + ' <span class="mgr-sub">(' + topScale + '亿)</span></div></td>' +
        "</tr>";
    });
    document.getElementById("mktMgrTbody").innerHTML = html;
    var cnt = document.getElementById("mktMgrCount");
    if (cnt) cnt.textContent = "共 " + data.head.length + " 家（按断档阈值筛选）";
  }

  function renderIdxTable(data) {
    var html = "";
    data.indexes.forEach(function (idx, i) {
      html += "<tr>" +
        '<td class="rank">' + (i + 1) + "</td>" +
        "<td>" + idx.indexName + "</td>" +
        '<td class="num">' + fmt(idx.scale) + "</td>" +
        '<td class="num">' + idx.count + "</td>" +
        "<td>" + idx.topMgr + "</td>" +
        '<td>' + idx.topName + ' <span class="mgr-sub">(' + fmt(idx.topScale) + '亿)</span></td>' +
        "</tr>";
    });
    document.getElementById("mktIdxTbody").innerHTML = html;
  }

  // ============ 竞争格局洞察（数据驱动，替代固定套话） ============
  function insight(data) {
    var total = data.total;
    var ranks = data.ranks;
    var head = data.head;
    var t1 = head[0], t2 = head[1], t3 = head[2];
    var top1Pct = total && t1 ? (t1.scale / total * 100).toFixed(1) : 0;
    var top3Pct = total ? (head.slice(0, 3).reduce(function (s, r) { return s + r.scale; }, 0) / total * 100).toFixed(1) : 0;
    var top5Pct = total ? (head.slice(0, 5).reduce(function (s, r) { return s + r.scale; }, 0) / total * 100).toFixed(1) : 0;
    var idxTop1 = data.indexes[0];
    var idxTop1Pct = idxTop1 && total ? (idxTop1.scale / total * 100).toFixed(1) : 0;

    var ef = data.efRow;
    var efRank = data.efRank;
    var efPct = ef && total ? (ef.scale / total * 100).toFixed(1) : 0;
    var gap1 = (t1 && t1.m !== "易方达基金" && ef) ? (t1.scale - ef.scale) : 0;
    var gap2 = (t2 && t2.m !== "易方达基金" && ef && efRank <= 2) ? (ef.scale - t2.scale) : 0;
    var efTop = ef ? ef.top : null;

    var o = { total: total, head: head, t1: t1, t2: t2, t3: t3, top1Pct: top1Pct, top3Pct: top3Pct, top5Pct: top5Pct, idxTop1: idxTop1, idxTop1Pct: idxTop1Pct, ef: ef, efRank: efRank, efPct: efPct, gap1: gap1, gap2: gap2, efTop: efTop };
    return o;
  }

  function concHead(head) { return head.map(function (r) { return r.m + "(" + fmt(r.scale) + "亿)"; }).join("、"); }

  function analyzeBroad(data) {
    var inS = insight(data);
    var html = "";
    if (!inS.ef) return '<p class="lead">易方达在' + data.def.title + '暂无产品布局。</p>';

    // 格局定性
    var headTxt = "";
    if (inS.top3Pct >= 70) headTxt = "头部高度集中：前三家合计占 " + inS.top3Pct + "%";
    else if (inS.top5Pct >= 80) headTxt = "中等集中：前五家合计占 " + inS.top5Pct + "%";
    else headTxt = "格局较为分散：前五家合计占 " + inS.top5Pct + "%";

    var posTxt = inS.efRank === 1 ? "易方达居首" : "易方达居第 " + inS.efRank + " 名";
    var compTxt = "";
    if (inS.efRank === 1 && inS.t2) compTxt = "领先第二名 " + inS.t2.m + " " + fmt(inS.gap2) + " 亿（" + (inS.t2.scale ? (inS.gap2 / inS.t2.scale * 100).toFixed(1) : 0) + "%）。";
    else if (inS.gap1 > 0) compTxt = "落后第一名 " + inS.t1.m + " " + fmt(inS.gap1) + " 亿（" + (inS.gap1 / inS.t1.scale * 100).toFixed(1) + "%）。";

    html += '<p class="lead"><b>' + data.def.title + ' · ' + posTxt + '</b>，' + inS.ef.count + ' 只产品，规模合计 <b>' + fmt(inS.ef.scale) + ' 亿元</b>（占该赛道 ' + inS.efPct + '%）。' + compTxt + '</p>';
    html += '<p class="lead">全市场竞争格局：' + headTxt + '。头部 ' + inS.head.length + ' 家：' + concHead(inS.head) + '。</p>';

    // 主流指数（宽基）
    if (inS.idxTop1) {
      html += '<p class="lead">最主流宽基指数为 <b>' + inS.idxTop1.indexName + '</b>，挂钩 ' + inS.idxTop1.count + ' 只 ETF、合计 ' + fmt(inS.idxTop1.scale) + ' 亿（占该类 ' + inS.idxTop1Pct + '%），规模第一产品为 ' + inS.idxTop1.topMgr + ' 的 ' + inS.idxTop1.topName + '（' + fmt(inS.idxTop1.topScale) + ' 亿）。</p>';
    }

    // 易方达生态位（宽基）：龙头产品与结构
    var efWide = (data.pool || []).filter(function (r) { return r.owner === "易方达基金"; });
    var efTop3 = topN(efWide, 3);
    html += '<h4>易方达生态位（' + data.def.title + '）</h4>';
    html += '<p>易方达在宽基赛道的核心是"指数大单品"模式：' + efTop3.map(function (r) { return '<b>' + r.name + '</b>(' + fmt(r.scaleYi) + '亿)'; }).join("、") +
      ' 构成第一梯队，占易方达宽基总规模的 ' + (inS.ef.scale ? (efTop3.reduce(function (s, r) { return s + (r.scaleYi || 0); }, 0) / inS.ef.scale * 100).toFixed(0) : 0) + '%。';
    if (inS.efRank === 1 && inS.t2) {
      html += '对比华夏（' + inS.t2.scale + ' 亿，' + inS.t2.count + ' 只），易方达产品数更少但单品规模更大，属于"少而精"策略。</p>';
    } else if (inS.gap1 > 0) {
      html += '对比第一名 ' + inS.t1.m + '（' + inS.t1.count + ' 只），易方达以较少产品实现了较高的集中规模。</p>';
    } else {
      html += '</p>';
    }

    return html;
  }

  function analyzeIndustryTheme(data) {
    var inS = insight(data);
    var html = "";
    if (!inS.ef) return '<p class="lead">易方达在' + data.def.title + '暂无产品布局。</p>';

    var posTxt = inS.efRank === 1 ? "易方达居首" : "易方达居第 " + inS.efRank + " 名";
    var compTxt = "";
    if (inS.efRank === 1 && inS.t2) compTxt = "领先第二名 " + inS.t2.m + " " + fmt(inS.gap2) + " 亿。";
    else if (inS.gap1 > 0) compTxt = "落后第一名 " + inS.t1.m + " " + fmt(inS.gap1) + " 亿（" + (inS.gap1 / inS.t1.scale * 100).toFixed(1) + "%）。";

    html += '<p class="lead"><b>' + data.def.title + ' · ' + posTxt + '</b>，' + inS.ef.count + ' 只产品，规模合计 <b>' + fmt(inS.ef.scale) + ' 亿元</b>（占该赛道 ' + inS.efPct + '%）。' + compTxt + '</p>';
    html += '<p class="lead">全市场竞争格局：前三家（' + inS.t1.m + '/' + inS.t2.m + '/' + inS.t3.m + '）合计占 ' + inS.top3Pct + '%，行业+主题是"平台型 vs 爆款型"分化明显的赛道：' +
      inS.t1.count + ' 只 vs ' + (inS.t2 ? inS.t2.count : 0) + ' 只 vs ' + (inS.t3 ? inS.t3.count : 0) + ' 只产品，单产品规模差异显著。</p>';

    if (inS.idxTop1) {
      html += '<p class="lead">最主流指数为 <b>' + inS.idxTop1.indexName + '</b>，挂钩 ' + inS.idxTop1.count + ' 只 ETF、合计 ' + fmt(inS.idxTop1.scale) + ' 亿（占该类 ' + inS.idxTop1Pct + '%），龙头产品为 ' + inS.idxTop1.topMgr + ' 的 ' + inS.idxTop1.topName + '（' + fmt(inS.idxTop1.topScale) + ' 亿）。</p>';
    }

    // 易方达生态位：聚焦的子赛道
    var efRows = (data.pool || []).filter(function (r) { return r.owner === "易方达基金"; });
    var efTop5 = topN(efRows, 5);
    var topIdxNames = efTop5.map(function (r) { return r.indexName; }).filter(function (x, i, a) { return a.indexOf(x) === i; });
    html += '<h4>易方达生态位（' + data.def.title + '）</h4>';
    html += '<p>易方达在行业+主题赛道重点布局的指数：' + topIdxNames.slice(0, 6).map(function (n) { return '<b>' + n + '</b>'; }).join("、") +
      '。核心大单品 ' + efTop5.slice(0, 3).map(function (r) { return r.name + '(' + fmt(r.scaleYi) + '亿)'; }).join("、") + '。</p>';
    if (inS.efRank === 2 && inS.t1) {
      html += '<p>与第一名 ' + inS.t1.m + '（' + inS.t1.scale + ' 亿）相比，易方达产品布局广度相近（' + inS.ef.count + ' vs ' + inS.t1.count + ' 只），差距主要在单品爆款效应上。</p>';
    }
    return html;
  }

  function analyzeFactor(data) {
    var inS = insight(data);
    var html = "";
    if (!inS.ef) return '<p class="lead">易方达在风格因子暂无产品。</p>';

    var posTxt = inS.efRank === 1 ? "易方达居首" : "易方达居第 " + inS.efRank + " 名";
    var compTxt = "";
    if (inS.efRank === 1 && inS.t2) compTxt = "领先第二名 " + inS.t2.m + " " + fmt(inS.gap2) + " 亿。";
    else if (inS.gap1 > 0) compTxt = "落后第一名 " + inS.t1.m + " " + fmt(inS.gap1) + " 亿（" + (inS.gap1 / inS.t1.scale * 100).toFixed(1) + "%）。";

    html += '<p class="lead"><b>风格因子类 · 总体市场规模较小</b>（' + data.def.title + '合计 ' + fmt(inS.total) + ' 亿），头部 ' + inS.head.length + ' 家占近全部份额。' + posTxt + '，' + inS.ef.count + ' 只产品，规模合计 <b>' + fmt(inS.ef.scale) + ' 亿元</b>（占该赛道 ' + inS.efPct + '%）。' + compTxt + '</p>';
    html += '<p class="lead">格局：' + concHead(inS.head.slice(0, 5)) + (inS.head.length > 5 ? " 等" : "") + '。</p>';

    if (inS.idxTop1) {
      html += '<p class="lead">最主流风格指数为 <b>' + inS.idxTop1.indexName + '</b>，挂钩 ' + inS.idxTop1.count + ' 只、合计 ' + fmt(inS.idxTop1.scale) + ' 亿（占该类 ' + inS.idxTop1Pct + '%），龙头为 ' + inS.idxTop1.topMgr + ' 的 ' + inS.idxTop1.topName + '（' + fmt(inS.idxTop1.topScale) + ' 亿）。</p>';
    }

    // 自由现金流专题（用户图3重点）
    var fcRows = (data.pool || []).filter(function (r) { return /现金流|自由现金流/.test(r.indexName || ""); });
    if (fcRows.length) {
      var fcByMgr = {};
      fcRows.forEach(function (r) { fcByMgr[r.owner] = (fcByMgr[r.owner] || 0) + (r.scaleYi || 0); });
      var fcArr = Object.keys(fcByMgr).map(function (k) { return { m: k, s: fcByMgr[k] }; }).sort(function (a, b) { return b.s - a.s; });
      html += '<p class="lead"><b>自由现金流</b>：' + fcRows.length + ' 只产品合计 ' + fmt(sum(fcRows)) + ' 亿，格局：' + fcArr.slice(0, 5).map(function (x) { return x.m + "(" + fmt(x.s) + "亿)"; }).join("、") + '。</p>';
    }

    var efRows = (data.pool || []).filter(function (r) { return r.owner === "易方达基金"; });
    var efTop3 = topN(efRows, 3);
    html += '<h4>易方达生态位（风格因子）</h4>';
    html += '<p>易方达布局的红利/成长/价值/自由现金流等 ' + inS.ef.count + ' 只产品中，核心为 ' + efTop3.map(function (r) { return r.name + '(' + fmt(r.scaleYi) + '亿)'; }).join("、") + '。</p>';

    return html;
  }

  function analyzeGeneric(data) {
    var inS = insight(data);
    var html = "";
    if (!inS.ef) {
      html += '<p class="lead">易方达在' + data.def.title + '暂无产品布局。本类头部为 ' + concHead(inS.head.slice(0, 5)) + '。</p>';
    } else {
      var posTxt = inS.efRank === 1 ? "易方达居首" : "易方达居第 " + inS.efRank + " 名";
      var compTxt = "";
      if (inS.efRank === 1 && inS.t2) compTxt = "领先第二名 " + inS.t2.m + " " + fmt(inS.gap2) + " 亿。";
      else if (inS.gap1 > 0) compTxt = "落后第一名 " + inS.t1.m + " " + fmt(inS.gap1) + " 亿（" + (inS.gap1 / inS.t1.scale * 100).toFixed(1) + "%）。";
      html += '<p class="lead"><b>' + data.def.title + ' · ' + posTxt + '</b>，' + inS.ef.count + ' 只产品，规模合计 <b>' + fmt(inS.ef.scale) + ' 亿元</b>（占该赛道 ' + inS.efPct + '%）。' + compTxt + '</p>';
      html += '<p class="lead">全市场竞争格局：前三家占 ' + inS.top3Pct + '%，头部 ' + inS.head.length + ' 家：' + concHead(inS.head) + '。</p>';
      if (inS.idxTop1 && inS.idxTop1.indexName) {
        html += '<p class="lead">该赛道主要挂钩的指数/标的方向为 <b>' + inS.idxTop1.indexName + '</b>（' + fmt(inS.idxTop1.scale) + ' 亿，' + inS.idxTop1.count + ' 只），龙头为 ' + inS.idxTop1.topMgr + '。</p>';
      }
      if (inS.efTop) {
        html += '<p class="lead">易方达该类核心产品：' + inS.efTop.name + '（' + fmt(inS.efTop.scaleYi) + ' 亿）。</p>';
      }
    }
    return html;
  }

  function renderAnalysis(data) {
    var html = "";
    if (data.typeKey === "broad") html = analyzeBroad(data);
    else if (data.typeKey === "industry_theme") html = analyzeIndustryTheme(data);
    else if (data.typeKey === "factor") html = analyzeFactor(data);
    else html = analyzeGeneric(data);
    document.getElementById("mktAnalysis").innerHTML = html;
  }

  function renderTab(typeKey) {
    var def = TYPE_DEFS[typeKey] || TYPE_DEFS.broad;
    var data = buildData(typeKey);
    document.getElementById("mktMgrTitle").textContent = "① 全市场该类管理人竞争格局（按规模排序）";
    document.getElementById("mktAnalysisTitle").textContent = "③ 易方达生态位与全市场格局 · " + def.title;

    // 货币类无跟踪指数概念，隐藏②块
    var idxPanel = document.getElementById("mktIdxPanel");
    if (typeKey === "currency") {
      if (idxPanel) idxPanel.style.display = "none";
    } else {
      if (idxPanel) idxPanel.style.display = "";
      document.getElementById("mktIdxTitle").textContent = "② 主流跟踪指数 · 全市场该类规模前 20";
      renderIdxTable(data);
    }

    renderMgrTable(data);
    renderAnalysis(data);
  }

  function bindTabs() {
    document.getElementById("marketTabs").addEventListener("click", function(e) {
      var btn = e.target.closest(".market-tab");
      if (!btn) return;
      var key = btn.getAttribute("data-type");
      this.querySelectorAll(".market-tab").forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");
      location.hash = "#market/" + key;
      renderTab(key);
    });
  }

  window.MKT_INIT = function() {
    if (!ALL_MGRS.length) return;
    bindTabs();
    var m = location.hash.match(/^#market\/(\w+)/);
    var type = m && TYPE_DEFS[m[1]] ? m[1] : "broad";
    document.querySelectorAll(".market-tab").forEach(function(b) {
      b.classList.toggle("active", b.getAttribute("data-type") === type);
    });
    renderTab(type);
  };
})();