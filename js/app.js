/* ============ ETF 产品线透视 · 多页面逻辑 ============ */
(function () {
  "use strict";

  var DATA = window.ETF_DATA || {};
  var MANAGERS = (DATA.managers || {});

  var CAT1_ORDER = ["股票", "商品", "债券", "货币"];
  var CAT2_ORDER = ["宽基", "行业", "主题", "风格因子"];

  var PAGES = [
    { key: "efunds", manager: "易方达基金" },
    { key: "chinaamc", manager: "华夏基金" },
    { key: "guotai", manager: "国泰基金" },
    { key: "huatai", manager: "华泰柏瑞基金" }
  ];

  // ---------- 工具 ----------
  function fmtScale(v) {
    return v == null ? "—" : (Math.round(Number(v) * 100) / 100).toLocaleString("zh-CN", { maximumFractionDigits: 2 }) + " 亿";
  }
  function fmtPct(v) {
    return v == null ? "—" : Number(v) + "%";
  }
  function fmtDate(v) {
    return v || "—";
  }
  function tagClass(prefix, val) {
    return "tag tag-" + prefix + "-" + (val || "其他");
  }

  // ---------- 单页面渲染器 ----------
  function createPage(p) {
    var rows = MANAGERS[p.manager] || [];
    var $ = function (id) { return document.getElementById(id); };
    var st = { f1: "all", f2: "all", sortKey: "scaleYi", sortDesc: true, mode1: "scale", mode2: "scale", pie1: null, pie2: null };
    var id = function (x) { return x + "-" + p.key; };

    function filtered() {
      return rows.filter(function (r) {
        if (st.f1 !== "all" && r.cat1 !== st.f1) return false;
        if (st.f2 !== "all" && r.cat2 !== st.f2) return false;
        return true;
      });
    }

    function renderStats() {
      var list = filtered();
      var total = list.length;
      var scaleSum = list.reduce(function (s, r) { return s + (r.scaleYi || 0); }, 0);
      var equityCount = list.filter(function (r) { return r.cat1 === "股票"; }).length;
      var feeItems = list.filter(function (r) { return r.mgtFee != null && r.scaleYi != null && r.scaleYi > 0; });
      var wNum = feeItems.reduce(function (s, r) { return s + r.mgtFee * r.scaleYi; }, 0);
      var wDen = feeItems.reduce(function (s, r) { return s + r.scaleYi; }, 0);
      var avgFee = wDen > 0 ? wNum / wDen : null;

      var cards = [
        { k: "当前 ETF 数", v: total, u: "只" },
        { k: "ETF 总规模", v: (Math.round(scaleSum * 100) / 100).toLocaleString("zh-CN", { maximumFractionDigits: 2 }), u: "亿元" },
        { k: "权益类产品", v: equityCount, u: "只 · 占 " + (total ? Math.round(equityCount / total * 100) : 0) + "%" },
        { k: "规模加权平均费率", v: avgFee == null ? "—" : avgFee.toFixed(3), u: "%" }
      ];
      $(id("statCards")).innerHTML = cards.map(function (c) {
        return '<div class="stat-card"><div class="k">' + c.k + '</div><div class="v">' + c.v + ' <small>' + c.u + "</small></div></div>";
      }).join("");
    }

    function cell(k, v, cls) {
      return '<td class="' + (cls || "") + '">' + v + "</td>";
    }

    function renderTable() {
      var list = filtered().slice().sort(function (a, b) {
        var av = a[st.sortKey], bv = b[st.sortKey];
        var aNull = av == null || av === "", bNull = bv == null || bv === "";
        if (aNull && bNull) return 0;
        if (aNull) return 1;
        if (bNull) return -1;
        if (typeof av === "number" && typeof bv === "number") {
          return st.sortDesc ? bv - av : av - bv;
        }
        var s = String(av).localeCompare(String(bv), "zh");
        return st.sortDesc ? -s : s;
      });

      var html = list.map(function (r, i) {
        return "<tr>" +
          cell("idx", i + 1) +
          cell("code", r.code, "code") +
          cell("name", r.name) +
          cell("", '<span class="' + tagClass("cat1", r.cat1) + '">' + r.cat1 + "</span>") +
          cell("", '<span class="' + tagClass("cat2", r.cat2) + '">' + r.cat2 + "</span>") +
          cell("num", fmtPct(r.mgtFee)) +
          cell("num", fmtPct(r.trstFee)) +
          cell("", r.indexName || "—") +
          cell("num scale", fmtScale(r.scaleYi)) +
          cell("", fmtDate(r.lstDt)) +
          "</tr>";
      }).join("");

      $(id("etfTbody")).innerHTML = html;
      $(id("rowCount")).textContent = "共 " + list.length + " 只";

      $(id("etfTable")).querySelectorAll("thead th").forEach(function (th) {
        if (!th.getAttribute("data-key")) return;
        th.classList.toggle("sorted", th.getAttribute("data-key") === st.sortKey);
        var arrow = th.querySelector(".arrow");
        if (arrow) arrow.remove();
        if (th.getAttribute("data-key") === st.sortKey) {
          var s = document.createElement("span");
          s.className = "arrow";
          s.innerHTML = st.sortDesc
            ? '<svg width="8" height="6" viewBox="0 0 8 6"><path d="M4 6L0 0h8z" fill="currentColor"/></svg>'
            : '<svg width="8" height="6" viewBox="0 0 8 6"><path d="M4 0l4 6H0z" fill="currentColor"/></svg>';
          th.appendChild(s);
        }
      });
    }

    $(id("etfTable")).querySelectorAll("thead th[data-key]").forEach(function (th) {
      th.addEventListener("click", function () {
        var k = th.getAttribute("data-key");
        if (k === st.sortKey) {
          st.sortDesc = !st.sortDesc;
        } else {
          st.sortKey = k;
          st.sortDesc = k === "name" || k === "code" || k === "indexName" ? false : true;
        }
        renderTable();
      });
    });

    function aggregate(items, key, group, mode) {
      var m = {};
      items.forEach(function (r) {
        var g = r[key];
        if (group.indexOf(g) < 0) g = "其他";
        m[g] = m[g] || { scale: 0, count: 0 };
        m[g].scale += r.scaleYi || 0;
        m[g].count += 1;
      });
      return group.map(function (g) {
        var it = m[g];
        if (!it) return null;
        var scale = +it.scale.toFixed(2);
        var fallback = mode === "scale" && scale === 0 && it.count > 0;
        var value = mode === "scale" ? (fallback ? it.count : scale) : it.count;
        return { name: g, value: value, count: it.count, scale: scale, fallback: fallback };
      }).filter(function (d) { return d && d.value > 0; });
    }

    function baseOption(mode, data, colors) {
      var isScale = mode === "scale";
      return {
        color: colors,
        tooltip: {
          trigger: "item",
          formatter: function (pp) {
            var d = pp.data;
            var lines = pp.name + "<br/>";
            if (isScale) {
              lines += "规模：" + (d.fallback ? "数据未提供" : (Math.round(d.scale * 100) / 100).toLocaleString("zh-CN", { maximumFractionDigits: 2 }) + " 亿元");
              if (d.fallback) lines += "（按数量展示）<br/>数量：" + d.count + " 只";
            } else {
              lines += "数量：" + d.count + " 只";
            }
            lines += "<br/>占比：" + pp.percent + "%";
            return lines;
          }
        },
        legend: {
          orient: "vertical",
          right: 8,
          top: "middle",
          itemWidth: 10,
          itemHeight: 10,
          textStyle: { fontSize: 12, color: "#6B6862" }
        },
        series: [{
          type: "pie",
          radius: ["42%", "72%"],
          center: ["38%", "50%"],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: "#fff", borderWidth: 2 },
          label: { show: true, formatter: "{b}\n{d}%", fontSize: 12, color: "#1C1B18" },
          labelLine: { length: 10, length2: 8 },
          data: data
        }]
      };
    }

    function renderCharts() {
      var cat1 = aggregate(rows, "cat1", CAT1_ORDER, st.mode1);
      var cat2 = aggregate(rows.filter(function (r) { return r.cat1 === "股票"; }), "cat2", CAT2_ORDER, st.mode2);
      st.pie1.setOption(baseOption(st.mode1, cat1, ["#24413B", "#C7B9A0", "#93A69A", "#5B7E9E"]), true);
      st.pie2.setOption(baseOption(st.mode2, cat2, ["#24413B", "#5B7E9E", "#C7B9A0", "#A8785A"]), true);
    }

    function bindSeg(segId, setter) {
      $(segId).addEventListener("click", function (e) {
        var btn = e.target.closest(".seg-btn");
        if (!btn) return;
        this.querySelectorAll(".seg-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        setter(btn.getAttribute("data-mode"));
        renderCharts();
      });
    }
    bindSeg(id("segCat1"), function (m) { st.mode1 = m; });
    bindSeg(id("segCat2"), function (m) { st.mode2 = m; });

    function bindFilter(segId, cb) {
      $(segId).addEventListener("click", function (e) {
        var btn = e.target.closest(".f-btn");
        if (!btn) return;
        this.querySelectorAll(".f-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        cb(btn.getAttribute("data-v"));
        renderStats();
        renderTable();
      });
    }
    bindFilter(id("filterCat1"), function (v) { st.f1 = v; });
    bindFilter(id("filterCat2"), function (v) { st.f2 = v; });

    // 初始化
    st.pie1 = echarts.init($(id("pieCat1")));
    st.pie2 = echarts.init($(id("pieCat2")));
    renderStats();
    renderTable();
    renderCharts();

    return {
      key: p.key,
      resize: function () {
        if (st.pie1) st.pie1.resize();
        if (st.pie2) st.pie2.resize();
      }
    };
  }

  var pageRenders = {};
  PAGES.forEach(function (p) { pageRenders[p.key] = createPage(p); });

  // ---------- 导航 ----------
  function switchPage(page) {
    var valid = ["home", "efunds", "compare", "chinaamc", "guotai", "huatai", "market"];
    if (valid.indexOf(page) < 0) page = "home";
    document.querySelectorAll(".nav-link, .nav-item").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-page") === page);
    });
    document.querySelectorAll(".page").forEach(function (s) {
      s.classList.toggle("hidden", s.id !== "page-" + page);
    });
    if (page === "compare" && window.CMP_INIT) window.CMP_INIT();
    if (page === "market" && window.MKT_INIT) window.MKT_INIT();
    if (pageRenders[page]) pageRenders[page].resize();
    if (page === "home") renderHome();
    window.scrollTo(0, 0);
  }

  document.querySelectorAll(".nav-link, .nav-item").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      switchPage(a.getAttribute("data-page"));
    });
  });

  // ---------- 首页（Hero + 6 个产品 Tile） ----------
  function renderHome() {
    var grid = document.getElementById("homeTiles");
    if (!grid) return;
    var mm = DATA.marketManagers || {};
    function sum(rows) { return (rows || []).reduce(function (s, r) { return s + (r.scaleYi || 0); }, 0); }
    function fmtYi(v) {
      if (v >= 10000) return (v / 10000).toFixed(2) + " 万亿";
      return v.toFixed(0) + " 亿";
    }
    function stat(mgr) {
      var rows = mm[mgr] || [];
      return { count: rows.length, scale: sum(rows) };
    }
    var tiles = [
      { page: "efunds", mgr: "易方达基金", theme: "light", size: "small",
        img: "assets/zszq_header.jpg", kicker: "Equity · Broad Market Leader" },
      { page: "chinaamc", mgr: "华夏基金", theme: "dark", size: "small" },
      { page: "guotai", mgr: "国泰基金", theme: "parchment", size: "small" },
      { page: "huatai", mgr: "华泰柏瑞基金", theme: "dark-2", size: "small" },
      { page: "market", theme: "light", custom: true, size: "half",
        kicker: "All · Market Pulse",
        title: "市场竞争格局", desc: Object.keys(mm).length + " 家管理人 · " + (DATA.marketTotal || 0) + " 只产品 · 全市场扫描" },
      { page: "compare", theme: "parchment", custom: true, size: "half",
        kicker: "Compare · Head-to-Head",
        title: "头部管理人对比", desc: "易方达 / 华夏 / 国泰 / 华泰柏瑞 横向对比" }
    ];
    grid.innerHTML = tiles.map(function (t) {
      var s = t.custom ? null : stat(t.mgr);
      var title = t.custom ? t.title : t.mgr;
      var desc, statHtml;
      if (t.custom) {
        desc = t.desc;
        statHtml = "";
      } else {
        desc = "管理 " + s.count + " 只 ETF · 合计 " + fmtYi(s.scale) + " 规模";
        statHtml = '<div class="tile-stat">' +
          '<span class="tile-stat-num">' + s.count + '</span>' +
          '<span class="tile-stat-label">只产品</span></div>' +
          '<div class="tile-stat tile-stat-scale">' +
          '<span class="tile-stat-num">' + s.scale.toFixed(0) + '</span>' +
          '<span class="tile-stat-label">亿元规模</span></div>';
      }
      var imgHtml = t.img ? '<div class="tile-bg" style="background-image:url(' + t.img + ')"></div>' : '';
      var kicker = t.kicker ? '<span class="tile-kicker">' + t.kicker + '</span>' : '';
      var sizeCls = t.size === "half" ? " tile-half" : "";
      return '<a class="tile tile-' + t.theme + sizeCls + '" href="#' + t.page + '" data-page="' + t.page + '">' +
        imgHtml +
        '<div class="tile-body">' +
          kicker +
          '<h3 class="tile-title">' + title + '</h3>' +
          '<p class="tile-desc">' + desc + '</p>' +
          statHtml +
          '<span class="tile-cta">查看详情 →</span>' +
        '</div>' +
      '</a>';
    }).join("");
  }

  function routeFromHash() {
    var h = location.hash.replace("#", "");
    if (h.indexOf("market/") === 0) {
      switchPage("market");
      return;
    }
    switchPage(h || "home");
  }
  window.addEventListener("hashchange", routeFromHash);

  // ---------- 启动 ----------
  var dde = document.getElementById("dataDate");
  if (dde) dde.textContent = DATA.dataDate || "—";
  renderHome();
  routeFromHash();
})();
