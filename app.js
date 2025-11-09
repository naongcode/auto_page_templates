// 🎨 1. 테마 컬러 선택 → 팔레트 생성
const themeInput = document.getElementById("themeColorInput");
const generateBtn = document.getElementById("generatePaletteBtn");
const paletteContainer = document.getElementById("palette");

// 10단계 회색조 텍스트 팔레트 (검정 -> 흰색)
const GRAYSCALE_TEXT_PALETTE = [
  "#000000", "#1A1A1A", "#333333", "#4D4D4D", "#666666",
  "#808080", "#999999", "#B3B3B3", "#CCCCCC", "#E6E6E6", "#FFFFFF"
];

let currentPalette = [];
let currentTextPalette = []; // 텍스트 색상 팔레트 추가
let selectedSection = null;

// ✅ HEX → HSL 변환 함수
function hexToHsl(hex) {
  hex = hex.replace("#", "");
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h, s;
  let l = (max + min) / 2;
  let d = max - min;

  if (d === 0) {
    h = s = 0;
  } else {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0));
        break;
      case g:
        h = ((b - r) / d + 2);
        break;
      case b:
        h = ((r - g) / d + 4);
        break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

// ✅ HSL → HEX 변환 함수
function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return (
    "#" +
    Math.round(f(0) * 255).toString(16).padStart(2, "0") +
    Math.round(f(8) * 255).toString(16).padStart(2, "0") +
    Math.round(f(4) * 255).toString(16).padStart(2, "0")
  );
}

// 헥스 -> RGB 변환 헬퍼
function hexToRgb(hex) {
  const r = parseInt(hex.substr(1, 2), 16);
  const g = parseInt(hex.substr(3, 2), 16);
  const b = parseInt(hex.substr(5, 2), 16);
  return { r, g, b };
}

// RGB -> 상대 휘도 계산 헬퍼
function getRelativeLuminance(rgb) {
  const sRGB = [rgb.r, rgb.g, rgb.b].map(val => {
    val /= 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

// 두 색상 간의 대비 비율 계산
function getContrastRatio(color1Hex, color2Hex) {
  const rgb1 = hexToRgb(color1Hex);
  const rgb2 = hexToRgb(color2Hex);

  const lum1 = getRelativeLuminance(rgb1);
  const lum2 = getRelativeLuminance(rgb2);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

// 배경색에 조화로운 텍스트 색상 생성
function generateHarmoniousTextColor(bgColorHex) {
  const hsl = hexToHsl(bgColorHex);
  let { h, s, l } = hsl;

  // 배경색의 밝기 계산 (기존 방식)
  const r = parseInt(bgColorHex.substr(1, 2), 16);
  const g = parseInt(bgColorHex.substr(3, 2), 16);
  const b = parseInt(bgColorHex.substr(5, 2), 16);
  const bgBrightness = (r * 299 + g * 587 + b * 114) / 1000;

  let newL;
  if (bgBrightness > 140) { // 밝은 배경 (텍스트는 어둡게)
    newL = Math.max(0, l - 50); // 기존 밝기에서 50% 감소
  } else { // 어두운 배경 (텍스트는 밝게)
    newL = Math.min(100, l + 50); // 기존 밝기에서 50% 증가
  }
  return hslToHex(h, s, newL);
}

// ✅ 단계별 색상 생성
function generateShades(hex, steps) {
  const base = hexToHsl(hex);
  const result = [];
  currentTextPalette = []; // 텍스트 팔레트 초기화

  for (let i = 0; i < steps; i++) {
    const newL = Math.min(100, Math.max(0, base.l - (i - 5) * 4));
    const bgColor = hslToHex(base.h, base.s, newL);
    result.push(bgColor);

    // 배경색의 밝기 계산 (generateHarmoniousTextColor 내부에도 있지만, 여기서는 fallback을 위해 필요)
    const r = parseInt(bgColor.substr(1, 2), 16);
    const g = parseInt(bgColor.substr(3, 2), 16);
    const b = parseInt(bgColor.substr(5, 2), 16);
    const bgBrightness = (r * 299 + g * 587 + b * 114) / 1000;

    const harmoniousColor = generateHarmoniousTextColor(bgColor);
    const contrastRatio = getContrastRatio(bgColor, harmoniousColor);

    let textColor;
    if (contrastRatio >= 4.5) { // WCAG AA 기준 충족 시 조화로운 색상 사용
      textColor = harmoniousColor;
    } else { // 대비 부족 시 흑백으로 대체
      textColor = bgBrightness > 140 ? "#000000" : "#ffffff";
    }
    currentTextPalette.push(textColor);
  }
  return result;
}

// ✅ 팔레트 UI 렌더링
function renderPalette() {
  paletteContainer.innerHTML = "";
  currentPalette.forEach((color, index) => {
    const div = document.createElement("div");
    div.className = "palette-color";
    div.style.background = color;
    div.title = color;
    div.dataset.bgColor = color; // 배경색 저장
    div.dataset.textColor = currentTextPalette[index]; // 텍스트 색상 저장
    div.addEventListener("click", () => applyColorToSection(div.dataset.bgColor, div.dataset.textColor));
    paletteContainer.appendChild(div);
  });
  paletteContainer.classList.add("show");
}

// 페이지 로드 시 초기 팔레트 생성
window.addEventListener('DOMContentLoaded', () => {
  const baseColor = themeInput.value;
  currentPalette = generateShades(baseColor, 10);
  renderPalette();

  // 각 섹션의 data-bg 속성을 읽어 초기 배경색 적용
  document.querySelectorAll(".section").forEach(section => {
    const initialBgColor = section.dataset.bg;
    if (initialBgColor) {
      section.style.setProperty("--section-bg", initialBgColor);
      section.style.backgroundColor = initialBgColor;

      // 배경색의 밝기 계산
      const r = parseInt(initialBgColor.substr(1, 2), 16);
      const g = parseInt(initialBgColor.substr(3, 2), 16);
      const b = parseInt(initialBgColor.substr(5, 2), 16);
      const bgBrightness = (r * 299 + g * 587 + b * 114) / 1000;

      const harmoniousColor = generateHarmoniousTextColor(initialBgColor);
      const contrastRatio = getContrastRatio(initialBgColor, harmoniousColor);

      let initialTextColor;
      if (contrastRatio >= 4.5) {
        initialTextColor = harmoniousColor;
      } else {
        initialTextColor = bgBrightness > 140 ? "#000000" : "#ffffff";
      }
      section.style.setProperty("--text-color", initialTextColor);

      // 초기 텍스트 색상의 RGB 값을 계산하여 --text-color-rgb 변수에 설정
      const rgb = hexToRgb(initialTextColor);
      section.style.setProperty("--text-color-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
  });
});

// ✅ 🎨 버튼 → 해당 섹션 선택
document.querySelectorAll(".section-color-btn").forEach(btn => {
  btn.addEventListener("click", e => {
    selectedSection = e.target.closest(".section");
    paletteContainer.classList.add("show");
  });
});

// ✅ 선택된 섹션에 색 적용
function applyColorToSection(bgColor, textColor) {
  if (!selectedSection) return;

  selectedSection.style.backgroundColor = bgColor;
  selectedSection.style.setProperty("--text-color", textColor);

  // textColor의 RGB 값을 계산하여 --text-color-rgb 변수에 설정
  const rgb = hexToRgb(textColor);
  selectedSection.style.setProperty("--text-color-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);

  paletteContainer.classList.remove("show");
  selectedSection = null;
}

// ✅ 단계별 색상 생성
