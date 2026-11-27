/* =========================================================
   TCGC PayTrack — analytics chart (students per year level)
   ========================================================= */

(function () {
  "use strict";

  var api = window.TCGC;
  var chartEl = document.getElementById("analytics-chart");
  var totalEl = document.getElementById("analytics-total");
  var peakEl = document.getElementById("analytics-peak");
  var peakNoteEl = document.getElementById("analytics-peak-note");
  var averageEl = document.getElementById("analytics-average");
  var countEl = document.getElementById("analytics-count");
  var noteEl = document.getElementById("analytics-note");

  if (!chartEl) return;

  var YEARS = ["1ST YEAR", "2ND YEAR", "3RD YEAR", "4TH YEAR"];
  var W = 760;
  var H = 360;
  var PAD = { left: 54, right: 26, top: 28, bottom: 64 };

  function yearBucket(value) {
    var text = String(value == null ? "" : value).trim().toUpperCase();
    if (!text) return "UNSPECIFIED";
    if (/\b1(ST)?\b|FIRST/.test(text)) return "1ST YEAR";
    if (/\b2(ND)?\b|SECOND/.test(text)) return "2ND YEAR";
    if (/\b3(RD)?\b|THIRD/.test(text)) return "3RD YEAR";
    if (/\b4(TH)?\b|FOURTH/.test(text)) return "4TH YEAR";
    return "OTHER";
  }

  function counts() {
    var students =
      window.TCGCStudents && window.TCGCStudents.getStudents
        ? window.TCGCStudents.getStudents()
        : [];
    var map = {};
    var other = 0;

    YEARS.forEach(function (year) {
      map[year] = 0;
    });

    students.forEach(function (student) {
      var bucket = yearBucket(student.year);
      if (map[bucket] == null) other += 1;
      else map[bucket] += 1;
    });

    var points = YEARS.map(function (label) {
      return { label: label, value: map[label] };
    });

    if (other > 0) points.push({ label: "OTHER", value: other });

    return points;
  }

  function smoothPath(points) {
    if (points.length < 2) return "";

    var path = "M " + points[0].x + " " + points[0].y;
    for (var i = 0; i < points.length - 1; i += 1) {
      var p0 = points[i - 1] || points[i];
      var p1 = points[i];
      var p2 = points[i + 1];
      var p3 = points[i + 2] || p2;
      var t = 0.18;
      var c1x = p1.x + (p2.x - p0.x) * t;
      var c1y = p1.y + (p2.y - p0.y) * t;
      var c2x = p2.x - (p3.x - p1.x) * t;
      var c2y = p2.y - (p3.y - p1.y) * t;
      path +=
        " C " + c1x + " " + c1y + ", " + c2x + " " + c2y + ", " + p2.x + " " + p2.y;
    }
    return path;
  }

  function svgFor(points, total) {
    var plotW = W - PAD.left - PAD.right;
    var plotH = H - PAD.top - PAD.bottom;
    var peak = points.reduce(function (max, point) {
      return Math.max(max, point.value);
    }, 0);
    var step = Math.max(1, Math.ceil(Math.max(peak, 1) / 4));
    var top = step * 4;
    var ticks = [0, 1, 2, 3, 4].map(function (index) {
      return index * step;
    });
    var xFor = function (index) {
      return PAD.left + (points.length === 1 ? plotW / 2 : (plotW * index) / (points.length - 1));
    };
    var yFor = function (value) {
      return PAD.top + plotH - (plotH * value) / (top || 1);
    };

    var plotted = points.map(function (point, index) {
      return {
        label: point.label,
        value: point.value,
        x: xFor(index),
        y: yFor(point.value),
        index: index
      };
    });

    var highest = plotted.reduce(function (best, point) {
      return point.value > best.value ? point : best;
    }, { value: -1 });

    var parts = [];
    parts.push(
      '<svg class="enroll-chart" viewBox="0 0 ' +
        W +
        " " +
        H +
        '" role="img" aria-label="Enrollment by year level. ' +
        points
          .map(function (point) {
            return point.label + ": " + point.value;
          })
          .join(", ") +
        ". " +
        total +
        ' students total.">'
    );
    parts.push(
      '<defs><linearGradient id="enrollFade" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#1f8a5f" stop-opacity="0.28"></stop>' +
        '<stop offset="100%" stop-color="#1f8a5f" stop-opacity="0"></stop>' +
        "</linearGradient></defs>"
    );

    ticks.forEach(function (tick) {
      parts.push(
        '<line class="enroll-chart__grid" x1="' +
          PAD.left +
          '" x2="' +
          (W - PAD.right) +
          '" y1="' +
          yFor(tick) +
          '" y2="' +
          yFor(tick) +
          '"></line>'
      );
      parts.push(
        '<text class="enroll-chart__tick" x="' +
          (PAD.left - 14) +
          '" y="' +
          yFor(tick) +
          '" text-anchor="end" dominant-baseline="middle">' +
          tick +
          "</text>"
      );
    });

    var line = smoothPath(plotted);
    var baseY = PAD.top + plotH;
    parts.push(
      '<path d="' +
        line +
        " L " +
        plotted[plotted.length - 1].x +
        " " +
        baseY +
        " L " +
        plotted[0].x +
        " " +
        baseY +
        ' Z" fill="url(#enrollFade)"></path>'
    );
    parts.push('<path class="enroll-chart__line" d="' + line + '"></path>');
    parts.push(
      '<line class="enroll-chart__guide" data-guide x1="0" x2="0" y1="' +
        PAD.top +
        '" y2="' +
        (PAD.top + plotH) +
        '"></line>'
    );

    plotted.forEach(function (point) {
      var isPeak = point.index === highest.index && point.value > 0;
      var amount =
        point.value + (point.value === 1 ? " student" : " students");

      parts.push(
        '<g class="enroll-node" tabindex="0" data-year="' +
          point.label +
          '" data-count="' +
          point.value +
          '" data-x="' +
          point.x +
          '" aria-label="' +
          point.label +
          ": " +
          amount +
          '">' +
          '<circle class="enroll-node__hit" cx="' +
          point.x +
          '" cy="' +
          point.y +
          '" r="22"></circle>' +
          '<circle class="enroll-chart__dot' +
          (isPeak ? " is-peak" : "") +
          '" cx="' +
          point.x +
          '" cy="' +
          point.y +
          '" r="' +
          (isPeak ? 7 : 5) +
          '"></circle>' +
          '<text class="enroll-chart__value' +
          (isPeak ? " is-peak" : "") +
          '" x="' +
          point.x +
          '" y="' +
          (point.y - (isPeak ? 16 : 13)) +
          '" text-anchor="middle">' +
          point.value +
          "</text>" +
          "</g>"
      );
      parts.push(
        '<text class="enroll-chart__label" x="' +
          point.x +
          '" y="' +
          (H - 26) +
          '" text-anchor="middle">' +
          point.label +
          "</text>"
      );
    });

    parts.push("</svg>");
    return parts.join("");
  }

  function render() {
    var points = counts();
    var total = points.reduce(function (sum, point) {
      return sum + point.value;
    }, 0);
    var highest = points.reduce(function (best, point) {
      return point.value > best.value ? point : best;
    }, points[0]);
    var average = points.length
      ? Math.round((total / points.length) * 10) / 10
      : 0;

    if (totalEl) totalEl.textContent = String(total);
    if (countEl) {
      countEl.textContent = total + (total === 1 ? " student" : " students");
    }
    if (averageEl) averageEl.textContent = String(average);
    if (peakEl) peakEl.textContent = highest && highest.value > 0 ? highest.label : "—";
    if (peakNoteEl) {
      peakNoteEl.textContent =
        highest && highest.value > 0
          ? highest.value + (highest.value === 1 ? " student" : " students")
          : "No records yet";
    }

    var session = api && api.getSession ? api.getSession() : null;
    var council = session && session.council ? session.council : "";
    if (noteEl) {
      noteEl.textContent = council
        ? council + " MEMBERS"
        : "NO COUNCIL/ORGANIZATION ASSIGNED";
    }

    if (!total) {
      chartEl.innerHTML =
        '<div class="chart-empty"><p>No enrollment data yet.</p>' +
        "<small>Import a student list in the Students tab to plot the chart.</small></div>";
      return;
    }

    chartEl.innerHTML =
      svgFor(points, total) +
      '<div class="enroll-tooltip" hidden><strong></strong><span></span></div>';

    var tooltip = chartEl.querySelector(".enroll-tooltip");
    var guide = chartEl.querySelector("[data-guide]");
    var nodes = chartEl.querySelectorAll(".enroll-node");

    function hideTip() {
      if (tooltip) tooltip.hidden = true;
      if (guide) guide.classList.remove("is-visible");
      Array.prototype.forEach.call(nodes, function (node) {
        node.classList.remove("is-active");
      });
    }

    function showTip(node) {
      if (!tooltip) return;

      var year = node.getAttribute("data-year") || "";
      var count = Number(node.getAttribute("data-count") || 0);

      tooltip.querySelector("strong").textContent = year;
      tooltip.querySelector("span").textContent =
        count + (count === 1 ? " student enrolled" : " students enrolled");

      var chartRect = chartEl.getBoundingClientRect();
      var nodeRect = node.getBoundingClientRect();
      var x = nodeRect.left - chartRect.left + nodeRect.width / 2;
      var y = nodeRect.top - chartRect.top;

      tooltip.style.left =
        Math.max(72, Math.min(chartRect.width - 72, x)) + "px";
      tooltip.style.top = Math.max(4, y) + "px";
      tooltip.hidden = false;

      if (guide) {
        var guideX = node.getAttribute("data-x");
        guide.setAttribute("x1", guideX);
        guide.setAttribute("x2", guideX);
        guide.classList.add("is-visible");
      }

      Array.prototype.forEach.call(nodes, function (other) {
        other.classList.toggle("is-active", other === node);
      });
    }

    Array.prototype.forEach.call(nodes, function (node) {
      node.addEventListener("mouseenter", function () {
        showTip(node);
      });
      node.addEventListener("focus", function () {
        showTip(node);
      });
      node.addEventListener("mouseleave", hideTip);
      node.addEventListener("blur", hideTip);
    });

    chartEl.addEventListener("mouseleave", hideTip);
  }

  window.TCGCRefreshAnalytics = render;
  render();
})();
