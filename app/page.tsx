"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";

type ViewKey = "home" | "exercise" | "diet" | "records" | "rank" | "me" | "success";
type Intensity = "轻松" | "正常" | "很累";
type BackgroundTheme = "blue" | "green" | "peach";
type Visibility = "public" | "private";
type FontOptionId =
  | "enjoyable"
  | "influencer"
  | "clean"
  | "zcool-kuaile"
  | "lemi-crayon"
  | "jiying-round"
  | "alibaba-light";
type TextSize = "sm" | "md" | "lg";
type PhotoStatus = "pending" | "approved" | "rejected";

type Group = {
  id: string;
  name: string;
  code: string;
  isPersonal?: boolean;
};

type ExerciseEntry = {
  date: string;
  tag: string;
  duration: number;
  intensity: Intensity;
  photo?: string;
  photoStatus?: PhotoStatus;
  leaveReason?: string;
};

type ExercisePhotoPreview = {
  src: string;
  title: string;
  status?: PhotoStatus;
  date: string;
};

type MealKey = "breakfast" | "lunch" | "dinner" | "snack";
type MealFieldKey = "greens" | "protein" | "grains" | "fruit" | "water" | "light" | "milkTea" | "fruitTea";

type MealRecord = {
  id: MealKey;
  label: string;
  logged: boolean;
  greens: boolean;
  protein: boolean;
  grains: boolean;
  fruit: boolean;
  water: boolean;
  light: boolean;
  milkTea: boolean;
  fruitTea: boolean;
};

type MealHistoryEntry = {
  date: string;
  meals: MealRecord[];
  mealPhotos?: Partial<Record<MealKey, string>>;
  mealNotes?: Partial<Record<MealKey, Partial<Record<MealFieldKey, string>>>>;
  score: number;
  loggedMealCount: number;
};

type CommunityUser = {
  id: string;
  nickname: string;
  mascot: string;
  points: number;
  visibility: Visibility;
  groupIds?: string[];
  exerciseEntries: ExerciseEntry[];
  mealHistory: Record<string, MealHistoryEntry>;
};

type AppState = {
  onboarded: boolean;
  userId: string;
  isAdmin: boolean;
  visibility: Visibility;
  mascot: string;
  nickname: string;
  points: number;
  mascotClaimed: boolean;
  exerciseEntries: ExerciseEntry[];
  exercisePointDates?: string[];
  mealRewardDates?: string[];
  meals: MealRecord[];
  exercisePhotos?: Record<string, string>;
  mealPhotos?: Partial<Record<MealKey, string>>;
  mealNotes?: Partial<Record<MealKey, Partial<Record<MealFieldKey, string>>>>;
  mealHistory?: Record<string, MealHistoryEntry>;
  selectedPlate?: string;
  quoteDate?: string;
  quoteOffset?: number;
  backgroundTheme?: BackgroundTheme;
  weeklyExerciseGoal?: number;
  currentGroupId?: string;
  groupIds?: string[];
  groupSetupVersion?: number;
  groups?: Group[];
  soundMuted?: boolean;
  users?: CommunityUser[];
  headingFont?: FontOptionId;
  bodyFont?: FontOptionId;
  textSize?: TextSize;
};

const mascotOptions = [
  { id: "main", label: "柴犬同学", image: "/checkin-assets/main-shiba-v2.png" },
  { id: "dog-1", label: "小狗同学", image: "/checkin-assets/mascot-dog-1-v2.png" },
  { id: "nailong", label: "奶龙同学", image: "/checkin-assets/mascot-nailong.png" },
  { id: "godzilla", label: "哥斯拉", image: "/checkin-assets/mascot-godzilla.png" },
  { id: "ruanruan", label: "软软同学", image: "/checkin-assets/mascot-ruanruan.png" },
  { id: "calico-cat", label: "三花猫", image: "/checkin-assets/mascot-calico-cat.png" },
  { id: "cat-1", label: "小猫同学", image: "/checkin-assets/mascot-cat-1.png" },
  { id: "cat-2", label: "花花小猫", image: "/checkin-assets/mascot-cat-2.png" },
  { id: "shark", label: "鲨鱼同学", image: "/checkin-assets/mascot-shark.png" },
  { id: "duck", label: "鸭鸭同学", image: "/checkin-assets/mascot-duck.png" },
  { id: "pigeon", label: "鸽子同学", image: "/checkin-assets/mascot-pigeon.png" },
  { id: "tiger", label: "老虎同学", image: "/checkin-assets/mascot-tiger.png" },
  { id: "pidan", label: "皮蛋同学", image: "/checkin-assets/mascot-pidan.png" },
  { id: "bad-dog", label: "坏小狗", image: "/checkin-assets/mascot-bad-dog.png" },
];

const pigReminderMascot = { id: "pig", label: "小猪提醒", image: "/checkin-assets/pig-mascot.png" };
const exercisePointReward = 10;
const perfectMealPointReward = 5;
const mascotChangeCost = 100;
const missedExerciseReminderDays = 3;
const adminAccount = { username: "admin", password: "healthy2026" };

const exerciseTags = ["游泳", "攀岩", "健身", "瑜伽", "徒步", "跳操", "跑步", "散步", "自定义"];
const leaveReasons = ["生理期", "身体不适", "受伤恢复", "太累了", "特殊安排"];
const intensities: Intensity[] = ["轻松", "正常", "很累"];
const durationOptions = [30, 60, 90, 120];

const exerciseArt: Record<string, string> = {
  游泳: "/checkin-assets/swim.png",
  攀岩: "/checkin-assets/climb.png",
  健身: "/checkin-assets/gym.png",
  瑜伽: "/checkin-assets/yoga.png",
  徒步: "/checkin-assets/hike.png",
  跳操: "/checkin-assets/dance.png",
  跑步: "/checkin-assets/workout.png",
  散步: "/checkin-assets/hike.png",
  自定义: "/checkin-assets/gym.png",
};

const dailyQuotes = [
  {
    title: "今天也慢慢变好",
    body: "先动一动，再好好吃饭，状态会一点点回来。",
  },
  {
    title: "把今天过得轻一点",
    body: "记录一餐，活动一下身体，小小调整也很有用。",
  },
  {
    title: "今天也贴一张健康",
    body: "运动、吃饭、喝水，都算在认真照顾自己。",
  },
  {
    title: "不用完美，也算数",
    body: "做到一点点，就已经是在好好生活了。",
  },
  {
    title: "先照顾身体这件事",
    body: "吃得真实一点，动得轻松一点，今天就很好。",
  },
  {
    title: "给自己一点好状态",
    body: "不用急着改变，先从一餐和一次活动开始。",
  },
  {
    title: "今天也有小小进步",
    body: "认真吃饭，轻轻运动，健康会慢慢累积。",
  },
  {
    title: "把身体哄舒服一点",
    body: "累的时候慢一点，能动的时候就动一动。",
  },
  {
    title: "今天先完成一点点",
    body: "一顿好饭，一次伸展，都值得被记录下来。",
  },
  {
    title: "健康不用太用力",
    body: "按自己的节奏来，能坚持的才最珍贵。",
  },
  {
    title: "给今天留一点能量",
    body: "吃好一点，走一走，别忘了也要休息。",
  },
  {
    title: "今天也在养成中",
    body: "不是追求满分，是让生活慢慢回到舒服的位置。",
  },
];

const fitnessDietAdvice = [
  { title: "训练前补碳水", body: "训练前 1-3 小时吃点米饭、面、燕麦或水果，让运动时更有力气。" },
  { title: "每餐都放蛋白", body: "鸡蛋、鱼虾、鸡胸、牛肉、豆腐或酸奶任选一种，帮助肌肉修复。" },
  { title: "餐盘先放蔬菜", body: "先保证一拳到两拳蔬菜，再搭配蛋白和碳水，饱腹感会更稳。" },
  { title: "别完全断碳水", body: "运动日保留适量碳水，能帮助训练表现和恢复体力。" },
  { title: "训练后要恢复", body: "运动后 2 小时内补一餐，碳水加蛋白比只喝饮料更适合恢复。" },
  { title: "水分提前准备", body: "运动前后都喝水，出汗多时可以补一点含钠食物或电解质。" },
  { title: "少喝含糖饮料", body: "奶茶和甜饮可以偶尔喝，日常优先无糖茶、水或低糖酸奶。" },
  { title: "蛋白不用堆太满", body: "每餐放一掌心优质蛋白就很实用，重点是每天持续吃够。" },
  { title: "晚餐别太油", body: "晚餐少油炸和厚重酱料，蛋白、蔬菜、碳水清爽搭配更容易坚持。" },
  { title: "加餐选真食物", body: "饿了可以选酸奶、水果、坚果或鸡蛋，比随手零食更稳。" },
  { title: "力量日吃扎实", body: "力量训练日别只吃沙拉，碳水和蛋白都要有，身体才有材料修复。" },
  { title: "有氧日补水分", body: "跑步、跳操、游泳这类出汗多的运动，先把水杯放在手边。" },
  { title: "早餐放点蛋白", body: "早餐加鸡蛋、牛奶、酸奶或豆浆，上午更不容易乱饿。" },
  { title: "碳水粗细搭配", body: "米饭可以搭配玉米、红薯、燕麦或杂粮，不必只吃一种。" },
  { title: "外食也能平衡", body: "点外卖时优先看有没有蛋白和蔬菜，再决定碳水份量。" },
  { title: "少油不是不吃脂肪", body: "坚果、鱼类、牛油果这类优质脂肪可以少量放进餐盘。" },
  { title: "别饿着去训练", body: "空腹训练容易没状态，时间紧就先吃半根香蕉或一小杯酸奶。" },
  { title: "恢复比克制重要", body: "运动后不要只靠忍，规律吃饭比极端少吃更利于长期变好。" },
  { title: "每周看趋势", body: "别被某一餐影响心情，看一周整体：运动次数、蛋白、蔬菜和水。" },
  { title: "真实食物优先", body: "优先选择少加工食物：肉蛋奶豆、蔬菜水果、全谷物和清爽饮水。" },
];

const defaultMeals: MealRecord[] = [
  { id: "breakfast", label: "早餐", logged: false, greens: false, protein: false, grains: false, fruit: false, water: false, light: false, milkTea: false, fruitTea: false },
  { id: "lunch", label: "午餐", logged: false, greens: true, protein: false, grains: false, fruit: false, water: false, light: false, milkTea: false, fruitTea: false },
  { id: "dinner", label: "晚餐", logged: false, greens: false, protein: false, grains: false, fruit: false, water: false, light: false, milkTea: false, fruitTea: false },
  { id: "snack", label: "加餐", logged: false, greens: false, protein: false, grains: false, fruit: false, water: false, light: false, milkTea: false, fruitTea: false },
];

const mealFields: Array<[MealFieldKey, string, string]> = [
  ["greens", "蔬菜", "比如西兰花、菠菜、番茄"],
  ["protein", "蛋白", "比如鸡蛋、鸡胸肉、豆腐"],
  ["grains", "碳水", "比如米饭、玉米、燕麦"],
  ["milkTea", "奶茶", "比如茉莉奶绿、半糖珍珠"],
  ["fruitTea", "果茶", "比如柠檬茶、葡萄果茶"],
];

const drinkAssets: Record<"milkTea" | "fruitTea", { image: string; label: string }> = {
  milkTea: { image: "/checkin-assets/drink-milk-tea-cup.png", label: "奶茶" },
  fruitTea: { image: "/checkin-assets/drink-fruit-tea-cup.png", label: "果茶" },
};

const plateOptions = [
  { id: "classic", label: "日常餐盘", image: "/checkin-assets/plate.png", price: "默认" },
  { id: "dog", label: "小狗蓝花盘", image: "/checkin-assets/plate-premium-dog.png", price: "120 积分" },
  { id: "flower", label: "粉花手作盘", image: "/checkin-assets/plate-premium-flower.png", price: "180 积分" },
];

const backgroundOptions: Array<{ id: BackgroundTheme; label: string }> = [
  { id: "blue", label: "蓝格" },
  { id: "green", label: "绿格" },
  { id: "peach", label: "桃格" },
];

const fontOptions: Array<{ id: FontOptionId; label: string; cssValue: string }> = [
  { id: "enjoyable", label: "手写体·圆润", cssValue: 'var(--font-src-enjoyable), "PingFang SC", sans-serif' },
  { id: "influencer", label: "手写体·随性", cssValue: 'var(--font-src-influencer), "PingFang SC", sans-serif' },
  { id: "clean", label: "简约黑体", cssValue: '"PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif' },
  { id: "alibaba-light", label: "阿里普惠体·细", cssValue: 'var(--font-src-alibaba-light), "PingFang SC", sans-serif' },
  { id: "zcool-kuaile", label: "站酷快乐体·粗", cssValue: 'var(--font-src-zcool-kuaile), "PingFang SC", sans-serif' },
  { id: "lemi-crayon", label: "乐米蜡笔体", cssValue: 'var(--font-src-lemi-crayon), "PingFang SC", sans-serif' },
  { id: "jiying-round", label: "毁片圆体·粗", cssValue: 'var(--font-src-jiying-round), "PingFang SC", sans-serif' },
];

const fontPreviewSample = "小柴打卡手帐";

const textSizeOptions: Array<{ id: TextSize; label: string }> = [
  { id: "sm", label: "小" },
  { id: "md", label: "中" },
  { id: "lg", label: "大" },
];

const defaultGroups: Group[] = [
  { id: "personal", name: "我的小手帐", code: "MEONLY", isPersonal: true },
  { id: "group-friends", name: "健康搭子群", code: "FIT2026" },
  { id: "group-test-10", name: "十人测试群", code: "TEST10" },
  { id: "group-lean-muscle", name: "薄肌俱乐部", code: "LEAN2026" },
];
const defaultUserGroupIds = ["personal", "group-lean-muscle"];
const currentGroupSetupVersion = 2;
const legacyAutoJoinedGroupIds = ["personal", "group-friends"];
const defaultWeeklyExerciseGoal = 2;

function mergeDefaultGroups(groups?: Group[]) {
  const merged = new Map(defaultGroups.map((group) => [group.id, group]));
  groups?.forEach((group) => merged.set(group.id, group));
  return Array.from(merged.values());
}

function normalizeUserGroupIds(groupIds?: string[], options: { removeLegacyAutoJoin?: boolean } = {}) {
  const uniqueIds = Array.from(new Set(["personal", ...(groupIds?.length ? groupIds : defaultUserGroupIds)]));
  const wasLegacyAutoJoin = legacyAutoJoinedGroupIds.every((id) => uniqueIds.includes(id))
    && uniqueIds.length === legacyAutoJoinedGroupIds.length;
  return options.removeLegacyAutoJoin && wasLegacyAutoJoin ? defaultUserGroupIds : uniqueIds;
}

function normalizeWeeklyGoal(goal?: number) {
  if (typeof goal !== "number" || !Number.isFinite(goal)) return defaultWeeklyExerciseGoal;
  return Math.min(Math.max(Math.round(goal), 1), 7);
}

function createMealHistoryEntry(date: string, overrides: Partial<MealRecord>[] = []): MealHistoryEntry {
  const meals = defaultMeals.map((meal, index) => ({
    ...meal,
    logged: index < 3,
    greens: index < 3,
    protein: index < 3,
    grains: index < 3,
    ...(overrides.find((item) => item.id === meal.id) ?? {}),
  }));

  return {
    date,
    meals,
    score: getDietScore(meals),
    loggedMealCount: meals.filter((meal) => meal.logged).length,
    mealPhotos: {},
    mealNotes: {},
  };
}

function createCommunityUsers(today = new Date()): CommunityUser[] {
  const testGroupMembers: CommunityUser[] = [
    {
      id: "u-test-qiqi",
      nickname: "七七",
      mascot: "/checkin-assets/mascot-calico-cat.png",
      points: 360,
      visibility: "public",
      groupIds: ["group-test-10"],
      exerciseEntries: [
        { date: formatDateKey(today), tag: "健身", duration: 40, intensity: "正常" },
        { date: formatDateKey(addDays(today, -1)), tag: "瑜伽", duration: 30, intensity: "轻松" },
        { date: formatDateKey(addDays(today, -3)), tag: "跑步", duration: 30, intensity: "正常" },
        { date: formatDateKey(addDays(today, -5)), tag: "游泳", duration: 45, intensity: "正常" },
      ],
      mealHistory: { [formatDateKey(today)]: createMealHistoryEntry(formatDateKey(today)) },
    },
    {
      id: "u-test-mai",
      nickname: "小麦",
      mascot: "/checkin-assets/mascot-dog-1-v2.png",
      points: 310,
      visibility: "public",
      groupIds: ["group-test-10"],
      exerciseEntries: [
        { date: formatDateKey(addDays(today, -1)), tag: "攀岩", duration: 45, intensity: "正常" },
        { date: formatDateKey(addDays(today, -2)), tag: "健身", duration: 40, intensity: "很累" },
        { date: formatDateKey(addDays(today, -4)), tag: "徒步", duration: 60, intensity: "正常" },
      ],
      mealHistory: { [formatDateKey(addDays(today, -1))]: createMealHistoryEntry(formatDateKey(addDays(today, -1))) },
    },
    {
      id: "u-test-soft",
      nickname: "软糖",
      mascot: "/checkin-assets/mascot-ruanruan.png",
      points: 280,
      visibility: "public",
      groupIds: ["group-test-10"],
      exerciseEntries: [
        { date: formatDateKey(today), tag: "跳操", duration: 30, intensity: "正常" },
        { date: formatDateKey(addDays(today, -3)), tag: "瑜伽", duration: 30, intensity: "轻松" },
      ],
      mealHistory: {},
    },
    {
      id: "u-test-long",
      nickname: "奶龙",
      mascot: "/checkin-assets/mascot-nailong.png",
      points: 260,
      visibility: "public",
      groupIds: ["group-test-10"],
      exerciseEntries: [
        { date: formatDateKey(addDays(today, -2)), tag: "游泳", duration: 45, intensity: "正常" },
        { date: formatDateKey(addDays(today, -4)), tag: "散步", duration: 30, intensity: "轻松" },
      ],
      mealHistory: {},
    },
    {
      id: "u-test-hua",
      nickname: "花花",
      mascot: "/checkin-assets/mascot-cat-2.png",
      points: 240,
      visibility: "public",
      groupIds: ["group-test-10"],
      exerciseEntries: [
        { date: formatDateKey(addDays(today, -1)), tag: "徒步", duration: 60, intensity: "正常" },
        { date: formatDateKey(addDays(today, -5)), tag: "瑜伽", duration: 30, intensity: "轻松" },
      ],
      mealHistory: {},
    },
    {
      id: "u-test-shark",
      nickname: "小鲨",
      mascot: "/checkin-assets/mascot-shark.png",
      points: 230,
      visibility: "public",
      groupIds: ["group-test-10"],
      exerciseEntries: [
        { date: formatDateKey(today), tag: "游泳", duration: 45, intensity: "正常" },
        { date: formatDateKey(addDays(today, -6)), tag: "健身", duration: 40, intensity: "很累" },
      ],
      mealHistory: {},
    },
    {
      id: "u-test-duck",
      nickname: "鸭鸭",
      mascot: "/checkin-assets/mascot-duck.png",
      points: 190,
      visibility: "public",
      groupIds: ["group-test-10"],
      exerciseEntries: [
        { date: formatDateKey(addDays(today, -3)), tag: "散步", duration: 30, intensity: "轻松" },
      ],
      mealHistory: {},
    },
    {
      id: "u-test-pidan",
      nickname: "皮蛋",
      mascot: "/checkin-assets/mascot-pidan.png",
      points: 170,
      visibility: "public",
      groupIds: ["group-test-10"],
      exerciseEntries: [
        { date: formatDateKey(addDays(today, -2)), tag: "健身", duration: 30, intensity: "正常" },
      ],
      mealHistory: {},
    },
    {
      id: "u-test-bad",
      nickname: "小坏",
      mascot: "/checkin-assets/mascot-bad-dog.png",
      points: 150,
      visibility: "public",
      groupIds: ["group-test-10"],
      exerciseEntries: [
        { date: formatDateKey(addDays(today, -4)), tag: "跑步", duration: 30, intensity: "正常" },
      ],
      mealHistory: {},
    },
    {
      id: "u-test-pigeon",
      nickname: "鸽鸽",
      mascot: "/checkin-assets/mascot-pigeon.png",
      points: 120,
      visibility: "private",
      groupIds: ["group-test-10"],
      exerciseEntries: [
        { date: formatDateKey(addDays(today, -1)), tag: "休息", duration: 0, intensity: "轻松", leaveReason: "身体不适" },
      ],
      mealHistory: {},
    },
  ];

  return [
    {
      id: "u-momo",
      nickname: "Momo",
      mascot: "/checkin-assets/rank-cat-original.png",
      points: 420,
      visibility: "public",
      groupIds: ["group-friends"],
      exerciseEntries: [
        { date: formatDateKey(addDays(today, -1)), tag: "攀岩", duration: 45, intensity: "正常" },
        { date: formatDateKey(addDays(today, -2)), tag: "瑜伽", duration: 30, intensity: "轻松" },
        { date: formatDateKey(addDays(today, -4)), tag: "健身", duration: 40, intensity: "很累" },
        { date: formatDateKey(addDays(today, -5)), tag: "游泳", duration: 45, intensity: "正常" },
      ],
      mealHistory: {
        [formatDateKey(addDays(today, -1))]: createMealHistoryEntry(formatDateKey(addDays(today, -1)), [
          { id: "lunch", milkTea: true },
        ]),
      },
    },
    {
      id: "u-xia",
      nickname: "小夏",
      mascot: "/checkin-assets/rank-tiger-original.png",
      points: 610,
      visibility: "public",
      groupIds: ["group-friends"],
      exerciseEntries: [
        { date: formatDateKey(today), tag: "健身", duration: 45, intensity: "正常" },
        { date: formatDateKey(addDays(today, -1)), tag: "跑步", duration: 30, intensity: "正常" },
        { date: formatDateKey(addDays(today, -2)), tag: "瑜伽", duration: 30, intensity: "轻松" },
        { date: formatDateKey(addDays(today, -3)), tag: "徒步", duration: 60, intensity: "正常" },
        { date: formatDateKey(addDays(today, -5)), tag: "游泳", duration: 45, intensity: "正常" },
      ],
      mealHistory: {
        [formatDateKey(today)]: createMealHistoryEntry(formatDateKey(today)),
      },
    },
    {
      id: "u-amin",
      nickname: "阿眠",
      mascot: "/checkin-assets/rank-shiba-original.png",
      points: 180,
      visibility: "private",
      groupIds: ["group-friends"],
      exerciseEntries: [
        { date: formatDateKey(addDays(today, -2)), tag: "散步", duration: 30, intensity: "轻松" },
        { date: formatDateKey(addDays(today, -3)), tag: "休息", duration: 0, intensity: "轻松", leaveReason: "身体不适" },
      ],
      mealHistory: {
        [formatDateKey(addDays(today, -2))]: createMealHistoryEntry(formatDateKey(addDays(today, -2)), [
          { id: "snack", logged: false, greens: false, protein: false, grains: false },
        ]),
      },
    },
    ...testGroupMembers,
  ];
}

function mergeCommunityUsers(users?: CommunityUser[], today = new Date()) {
  const merged = new Map(createCommunityUsers(today).map((user) => [user.id, user]));
  users?.forEach((user) => merged.set(user.id, user));
  return Array.from(merged.values());
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatStatusBarTime(date: Date) {
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

function createInitialState(): AppState {
  const today = new Date();
  return {
    onboarded: false,
    userId: `user-${formatDateKey(today)}`,
    isAdmin: false,
    visibility: "public",
    mascot: "main",
    nickname: "",
    points: 0,
    mascotClaimed: false,
    exerciseEntries: [],
    exercisePointDates: [],
    mealRewardDates: [],
    meals: defaultMeals,
    exercisePhotos: {},
    mealPhotos: {},
    mealNotes: {},
    mealHistory: {},
    selectedPlate: "classic",
    quoteDate: formatDateKey(today),
    quoteOffset: 0,
    backgroundTheme: "blue",
    weeklyExerciseGoal: defaultWeeklyExerciseGoal,
    currentGroupId: "personal",
    groupIds: defaultUserGroupIds,
    groupSetupVersion: currentGroupSetupVersion,
    groups: defaultGroups,
    soundMuted: false,
    users: createCommunityUsers(today),
    headingFont: "enjoyable",
    bodyFont: "influencer",
    textSize: "md",
  };
}

function normalizeMeals(meals: MealRecord[] | undefined) {
  if (!meals) return defaultMeals;
  return defaultMeals.map((fallbackMeal) => ({
    ...fallbackMeal,
    ...(meals.find((meal) => meal.id === fallbackMeal.id) ?? {}),
    milkTea: meals.find((meal) => meal.id === fallbackMeal.id)?.milkTea ?? false,
    fruitTea: meals.find((meal) => meal.id === fallbackMeal.id)?.fruitTea ?? false,
  }));
}

function normalizeExerciseEntries(entries: ExerciseEntry[] | undefined) {
  return (entries ?? []).map((entry) => ({
    ...entry,
    photoStatus: entry.photo && !entry.photoStatus ? "pending" : entry.photoStatus,
  }));
}

function getPhotoStatusLabel(status?: PhotoStatus) {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "未通过";
  return "待审核";
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image-load-failed"));
    };
    image.src = url;
  });
}

async function compressPhotoFile(file: File, maxSide = 900, quality = 0.72) {
  if (!file.type.startsWith("image/")) {
    throw new Error("not-image");
  }

  const image = await loadImageFromFile(file);
  const scale = Math.min(maxSide / Math.max(image.naturalWidth, image.naturalHeight), 1);
  const width = Math.max(Math.round(image.naturalWidth * scale), 1);
  const height = Math.max(Math.round(image.naturalHeight * scale), 1);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas-unavailable");
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

function getDailyQuoteIndex(dateKey: string) {
  const seed = Number(dateKey.replaceAll("-", ""));
  return seed % dailyQuotes.length;
}

function getDailyAdviceIndex(dateKey: string) {
  const seed = Number(dateKey.replaceAll("-", ""));
  return seed % fitnessDietAdvice.length;
}

function splitHeadline(title: string) {
  const midpoint = Math.ceil(title.length / 2);
  return [title.slice(0, midpoint), title.slice(midpoint)];
}

function getWeekEntries(entries: ExerciseEntry[], today = new Date()) {
  const start = startOfWeek(today);
  return entries.filter((entry) => new Date(entry.date) >= start && !entry.leaveReason && entry.photoStatus !== "rejected");
}

function getTodayExercise(entries: ExerciseEntry[], todayKey: string) {
  return entries.find((entry) => entry.date === todayKey);
}

function getMissedExerciseDays(entries: ExerciseEntry[], today = new Date()) {
  let missedDays = 0;
  for (let index = 0; index < missedExerciseReminderDays; index += 1) {
    const dateKey = formatDateKey(addDays(today, -index));
    const entry = entries.find((item) => item.date === dateKey);
    if (entry) break;
    missedDays += 1;
  }
  return missedDays;
}

function getDietScore(meals: MealRecord[]) {
  const loggedMeals = meals.filter((meal) => meal.logged);
  const points = loggedMeals.reduce((sum, meal) => {
    return sum + Number(meal.greens) + Number(meal.protein) + Number(meal.grains);
  }, 0);
  const max = Math.max(loggedMeals.length * 3, 1);
  const drinkPenalty = loggedMeals.some((meal) => meal.milkTea || meal.fruitTea) ? 30 : 0;
  return Math.max(Math.round((points / max) * 100) - drinkPenalty, 0);
}

function getDietTip(meals: MealRecord[]) {
  const loggedMeals = meals.filter((meal) => meal.logged);
  if (loggedMeals.length === 0) return "先记录一餐就很好，不需要一开始追求完美。";
  if (!loggedMeals.some((meal) => meal.greens)) return "今天蔬菜有点少，下一餐补一点绿色吧。";
  if (!loggedMeals.some((meal) => meal.protein)) return "可以加一点优质蛋白，比如鸡蛋、鱼、豆制品或酸奶。";
  return "今天的餐盘很稳，继续保持真实食物和清爽饮水。";
}

export default function Home() {
  const [state, setState] = useState<AppState>(() => createInitialState());
  const [readyToSave, setReadyToSave] = useState(false);
  const [view, setView] = useState<ViewKey>("home");
  const [selectedExerciseTag, setSelectedExerciseTag] = useState("健身");
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [customDurationInput, setCustomDurationInput] = useState("");
  const [selectedIntensity, setSelectedIntensity] = useState<Intensity>("正常");
  const [selectedMealId, setSelectedMealId] = useState<MealKey>("lunch");
  const [selectedMealField, setSelectedMealField] = useState<MealFieldKey>("greens");
  const [showPlatePicker, setShowPlatePicker] = useState(false);
  const [showMascotPicker, setShowMascotPicker] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState("");
  const [successText, setSuccessText] = useState("今天的健康小目标贴好了。");
  const [onboardingName, setOnboardingName] = useState("");
  const [onboardingMascot, setOnboardingMascot] = useState("main");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [selectedRecordUserId, setSelectedRecordUserId] = useState("me");
  const [adminTargetUserId, setAdminTargetUserId] = useState("u-momo");
  const [adminPointAmount, setAdminPointAmount] = useState(50);
  const [showAllMealHistory, setShowAllMealHistory] = useState(false);
  const [statusBarTime, setStatusBarTime] = useState(() => formatStatusBarTime(new Date()));
  const [openFontMenu, setOpenFontMenu] = useState<"heading" | "body" | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [joinGroupCode, setJoinGroupCode] = useState("");
  const [exercisePhotoPreview, setExercisePhotoPreview] = useState<ExercisePhotoPreview | null>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

  const todayKey = useMemo(() => formatDateKey(new Date()), []);
  const todayLabel = useMemo(() => {
    const date = new Date();
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }, []);
  const quoteOffset = state.quoteDate === todayKey ? state.quoteOffset ?? 0 : 0;
  const quoteIndex = (getDailyQuoteIndex(todayKey) + quoteOffset) % dailyQuotes.length;
  const dailyQuote = dailyQuotes[quoteIndex];
  const dailyTitleLines = splitHeadline(dailyQuote.title);
  const dailyFoodAdvice = fitnessDietAdvice[getDailyAdviceIndex(todayKey)] ?? fitnessDietAdvice[0];
  const currentBackground = backgroundOptions.find((item) => item.id === state.backgroundTheme) ?? backgroundOptions[0];
  const currentHeadingFont = fontOptions.find((item) => item.id === state.headingFont) ?? fontOptions[0];
  const currentBodyFont = fontOptions.find((item) => item.id === state.bodyFont) ?? fontOptions[1];
  const currentTextSize = textSizeOptions.find((item) => item.id === state.textSize) ?? textSizeOptions[1];
  const groups = mergeDefaultGroups(state.groups);
  const communityUsers = mergeCommunityUsers(state.users, new Date());
  const joinedGroupIds = normalizeUserGroupIds(state.groupIds)
    .filter((groupId) => groups.some((group) => group.id === groupId));
  const joinedGroups = groups.filter((group) => joinedGroupIds.includes(group.id));
  const currentGroup = joinedGroups.find((group) => group.id === state.currentGroupId) ?? joinedGroups[0] ?? defaultGroups[0];
  const groupUsers = communityUsers.filter((user) => (user.groupIds ?? ["group-friends"]).includes(currentGroup.id));
  const soundMuted = state.soundMuted ?? false;

  const mascot = mascotOptions.find((item) => item.id === state.mascot) ?? mascotOptions[0];
  const userNickname = state.nickname?.trim() || mascot.label;
  const missedExerciseDays = getMissedExerciseDays(state.exerciseEntries);
  const isPigReminder = missedExerciseDays >= missedExerciseReminderDays;
  const displayMascot = isPigReminder ? pigReminderMascot : mascot;
  const displayPoints = state.isAdmin ? "∞" : String(state.points ?? 0);
  const weekEntries = getWeekEntries(state.exerciseEntries);
  const weeklyExerciseGoal = normalizeWeeklyGoal(state.weeklyExerciseGoal);
  const todayExercise = getTodayExercise(state.exerciseEntries, todayKey);
  const todayExercisePhoto = state.exercisePhotos?.[todayKey] ?? todayExercise?.photo;
  const selectedExerciseArt = exerciseArt[selectedExerciseTag] ?? exerciseArt["健身"];
  const mealPhotos = state.mealPhotos ?? {};
  const exerciseProgress = Math.min(weekEntries.length, weeklyExerciseGoal);
  const loggedMealCount = state.meals.filter((meal) => meal.logged).length;
  const dietScore = getDietScore(state.meals);
  const dietTip = getDietTip(state.meals);
  const selectedMeal = state.meals.find((meal) => meal.id === selectedMealId) ?? state.meals[1];
  const selectedMealPhoto = mealPhotos[selectedMeal.id];
  const successMeal = state.meals.find((meal) => meal.logged && mealPhotos[meal.id])
    ?? state.meals.find((meal) => meal.logged)
    ?? selectedMeal;
  const successMealPhoto = mealPhotos[successMeal.id];
  const successMealDrink = successMeal.fruitTea ? "fruitTea" : successMeal.milkTea ? "milkTea" : null;
  const selectedPlate = plateOptions.find((plate) => plate.id === state.selectedPlate) ?? plateOptions[0];
  const selectedMealNotes = state.mealNotes?.[selectedMeal.id] ?? {};
  const selectedMealFieldMeta = mealFields.find(([field]) => field === selectedMealField) ?? mealFields[0];
  const mealAnnotations = mealFields
    .filter(([field]) => field !== "water" && field !== "milkTea" && field !== "fruitTea")
    .filter(([field]) => selectedMeal[field] || selectedMealNotes[field])
    .map(([field, label]) => ({
      field,
      label,
      text: selectedMealNotes[field] || label,
      filled: Boolean(selectedMealNotes[field]),
    }))
    .sort((left, right) => Number(right.filled) - Number(left.filled))
    .slice(0, 4);
  const drinkNotes = [
    selectedMeal.milkTea ? { field: "milkTea", label: selectedMealNotes.milkTea || "奶茶" } : null,
    selectedMeal.fruitTea ? { field: "fruitTea", label: selectedMealNotes.fruitTea || "果茶" } : null,
  ].filter(Boolean) as Array<{ field: "milkTea" | "fruitTea"; label: string }>;
  const rankedUsers = [
    { id: "me", name: userNickname, count: weekEntries.length, image: displayMascot.image },
    ...groupUsers.map((user) => ({
      id: user.id,
      name: user.nickname,
      count: getWeekEntries(user.exerciseEntries).length,
      image: user.mascot,
    })),
  ].sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "zh-CN"));
  const podiumUsers = [
    rankedUsers[1] ? { ...rankedUsers[1], rank: 2, className: "second" } : null,
    rankedUsers[0] ? { ...rankedUsers[0], rank: 1, className: "first" } : null,
    rankedUsers[2] ? { ...rankedUsers[2], rank: 3, className: "third" } : null,
  ].filter(Boolean) as Array<{ rank: number; name: string; count: number; image: string; className: string }>;
  const isSinglePodium = podiumUsers.length === 1;
  const rankRows = rankedUsers.map((user, index) => ({
    rank: index + 1,
    name: user.name,
    value: `本周运动 ${user.count} 次`,
  }));
  const recordUsers = [
    {
      id: "me",
      nickname: userNickname,
      mascot: displayMascot.image,
      visibility: state.visibility,
      exerciseEntries: state.exerciseEntries,
      mealHistory: state.mealHistory ?? {},
      points: state.points ?? 0,
      isCurrent: true,
    },
    ...groupUsers.map((user) => ({ ...user, isCurrent: false })),
  ];
  const selectedRecordUser = recordUsers.find((user) => user.id === selectedRecordUserId) ?? recordUsers[0];
  const selectedRecordVisible = selectedRecordUser.isCurrent || state.isAdmin || selectedRecordUser.visibility === "public";
  const selectedRecordExercises = [...selectedRecordUser.exerciseEntries].sort((left, right) => right.date.localeCompare(left.date));
  const selectedRecordMeals = Object.values(selectedRecordUser.mealHistory).sort((left, right) => right.date.localeCompare(left.date));
  const displayedRecordMeals = showAllMealHistory ? selectedRecordMeals : selectedRecordMeals.slice(0, 7);
  const exercisePhotoReviews = [
    ...state.exerciseEntries
      .filter((entry) => entry.photo)
      .map((entry) => ({ ownerId: "me", ownerName: userNickname, entry })),
    ...communityUsers.flatMap((user) => (
      user.exerciseEntries
        .filter((entry) => entry.photo)
        .map((entry) => ({ ownerId: user.id, ownerName: user.nickname, entry }))
    )),
  ].sort((left, right) => right.entry.date.localeCompare(left.entry.date));

  useEffect(() => {
    const updateTime = () => setStatusBarTime(formatStatusBarTime(new Date()));
    updateTime();
    const timer = window.setInterval(updateTime, 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (view !== "me") setOpenFontMenu(null);
  }, [view]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("cozy-health-state-v2");
      if (!saved) {
        setReadyToSave(true);
        return;
      }

      try {
        const parsed = JSON.parse(saved) as Partial<AppState>;
        const fallback = createInitialState();
        const normalizedMascot = parsed.mascot === "pink-godzilla" ? "ruanruan" : parsed.mascot;
        const savedMascot = mascotOptions.some((option) => option.id === normalizedMascot) ? normalizedMascot : fallback.mascot;
        const savedBackground = backgroundOptions.some((option) => option.id === parsed.backgroundTheme)
          ? parsed.backgroundTheme
          : fallback.backgroundTheme;
        const savedGroups = mergeDefaultGroups(parsed.groups);
        const savedGroupIds = normalizeUserGroupIds(parsed.groupIds, {
          removeLegacyAutoJoin: (parsed.groupSetupVersion ?? 1) < currentGroupSetupVersion,
        })
          .filter((groupId) => (savedGroups ?? defaultGroups).some((group) => group.id === groupId));
        const savedCurrentGroupId = savedGroupIds.includes(parsed.currentGroupId ?? "")
          ? parsed.currentGroupId
          : fallback.currentGroupId;
        setState({
          onboarded: parsed.onboarded ?? Boolean(parsed.nickname),
          userId: parsed.userId ?? fallback.userId,
          isAdmin: parsed.isAdmin ?? false,
          visibility: parsed.visibility ?? fallback.visibility,
          mascot: savedMascot ?? fallback.mascot,
          nickname: parsed.nickname ?? fallback.nickname,
          points: parsed.isAdmin ? parsed.points ?? 999999 : parsed.points ?? fallback.points,
          mascotClaimed: parsed.mascotClaimed ?? fallback.mascotClaimed,
          exerciseEntries: normalizeExerciseEntries(parsed.exerciseEntries ?? fallback.exerciseEntries),
          exercisePointDates: parsed.exercisePointDates ?? fallback.exercisePointDates,
          mealRewardDates: parsed.mealRewardDates ?? fallback.mealRewardDates,
          meals: normalizeMeals(parsed.meals),
          exercisePhotos: parsed.exercisePhotos ?? fallback.exercisePhotos,
          mealPhotos: parsed.mealPhotos ?? fallback.mealPhotos,
          mealNotes: parsed.mealNotes ?? fallback.mealNotes,
          mealHistory: parsed.mealHistory ?? fallback.mealHistory,
          selectedPlate: parsed.selectedPlate ?? fallback.selectedPlate,
          quoteDate: parsed.quoteDate ?? fallback.quoteDate,
          quoteOffset: parsed.quoteOffset ?? fallback.quoteOffset,
          backgroundTheme: savedBackground ?? fallback.backgroundTheme,
          weeklyExerciseGoal: normalizeWeeklyGoal(parsed.weeklyExerciseGoal ?? fallback.weeklyExerciseGoal),
          currentGroupId: savedCurrentGroupId ?? fallback.currentGroupId,
          groupIds: savedGroupIds.length ? savedGroupIds : fallback.groupIds,
          groupSetupVersion: currentGroupSetupVersion,
          groups: savedGroups,
          soundMuted: parsed.soundMuted ?? fallback.soundMuted,
          headingFont: fontOptions.some((option) => option.id === parsed.headingFont)
            ? parsed.headingFont
            : (parsed as { fontStyle?: string }).fontStyle === "clean"
              ? "clean"
              : fallback.headingFont,
          bodyFont: fontOptions.some((option) => option.id === parsed.bodyFont)
            ? parsed.bodyFont
            : (parsed as { fontStyle?: string }).fontStyle === "clean"
              ? "clean"
              : fallback.bodyFont,
          textSize: textSizeOptions.some((option) => option.id === parsed.textSize) ? parsed.textSize : fallback.textSize,
          users: mergeCommunityUsers(parsed.users, new Date()).map((user) => ({
            ...user,
            groupIds: user.groupIds?.length ? user.groupIds : ["group-friends"],
            exerciseEntries: normalizeExerciseEntries(user.exerciseEntries),
          })),
        });
      } catch {
        setState(createInitialState());
      } finally {
        setReadyToSave(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!readyToSave) return;
    const patchedGroups = mergeDefaultGroups(state.groups);
    const patchedUsers = mergeCommunityUsers(state.users, new Date());
    const needsGroupPatch = patchedGroups.length !== (state.groups?.length ?? 0);
    const needsUserPatch = patchedUsers.length !== (state.users?.length ?? 0);
    const normalizedGroupIds = normalizeUserGroupIds(state.groupIds, {
      removeLegacyAutoJoin: (state.groupSetupVersion ?? 1) < currentGroupSetupVersion,
    });
    const needsJoinedGroupPatch = normalizedGroupIds.join("|") !== (state.groupIds ?? []).join("|");
    const needsGroupSetupPatch = (state.groupSetupVersion ?? 1) < currentGroupSetupVersion;

    if (needsGroupPatch || needsUserPatch || needsJoinedGroupPatch || needsGroupSetupPatch) {
      window.setTimeout(() => {
        setState((current) => ({
          ...current,
          ...(() => {
            const nextGroupIds = normalizeUserGroupIds(current.groupIds, {
              removeLegacyAutoJoin: (current.groupSetupVersion ?? 1) < currentGroupSetupVersion,
            });
            return {
              currentGroupId: nextGroupIds.includes(current.currentGroupId ?? "") ? current.currentGroupId : "personal",
              groupIds: nextGroupIds,
              groupSetupVersion: currentGroupSetupVersion,
              groups: mergeDefaultGroups(current.groups),
              users: mergeCommunityUsers(current.users, new Date()),
            };
          })(),
        }));
      }, 0);
      return;
    }

    try {
      window.localStorage.setItem("cozy-health-state-v2", JSON.stringify(state));
    } catch (error) {
      console.warn("Failed to save app state locally.", error);
    }
  }, [readyToSave, state]);

  useEffect(() => {
    const audio = bgmRef.current;
    if (!audio) return;
    audio.volume = 0.28;
    if (!state.onboarded || soundMuted) {
      audio.pause();
      return;
    }
    audio.play().catch(() => {
      // 浏览器需要用户先点击一次页面，下一次按钮交互会继续尝试播放。
    });
  }, [soundMuted, state.onboarded]);

  function playClickSound() {
    if (soundMuted) return;
    const audio = clickAudioRef.current;
    if (!audio) return;
    audio.volume = 0.36;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  function handleAppClick(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button")) playClickSound();
    if (!soundMuted && state.onboarded) {
      bgmRef.current?.play().catch(() => {});
    }
    if (openFontMenu && !target.closest(".font-select")) {
      setOpenFontMenu(null);
    }
  }

  function showSuccess(text: string) {
    setSuccessText(text);
    setView("success");
  }

  function completeOnboarding() {
    const name = onboardingName.trim();
    const wantsAdmin = name.toLowerCase() === adminAccount.username;
    if (!name) {
      setSettingsFeedback("先写一个用户名，再开始贴手帐。");
      return;
    }
    if (wantsAdmin && adminPasswordInput !== adminAccount.password) {
      setSettingsFeedback("管理员密码不对，普通用户可以换一个用户名进入。");
      return;
    }

    setState((current) => ({
      ...current,
      onboarded: true,
      isAdmin: wantsAdmin,
      nickname: wantsAdmin ? "管理员" : name.slice(0, 8),
      mascot: onboardingMascot,
      mascotClaimed: true,
      points: wantsAdmin ? 999999 : current.points,
      visibility: "public",
    }));
    setSettingsFeedback("");
  }

  function changeDailyQuote() {
    setState((current) => ({
      ...current,
      quoteDate: todayKey,
      quoteOffset: current.quoteDate === todayKey ? (current.quoteOffset ?? 0) + 1 : 1,
    }));
  }

  function changeBackground(theme: BackgroundTheme) {
    setState((current) => ({
      ...current,
      backgroundTheme: theme,
    }));
  }

  function changeHeadingFont(id: FontOptionId) {
    setState((current) => ({
      ...current,
      headingFont: id,
    }));
  }

  function changeBodyFont(id: FontOptionId) {
    setState((current) => ({
      ...current,
      bodyFont: id,
    }));
  }

  function changeTextSize(size: TextSize) {
    setState((current) => ({
      ...current,
      textSize: size,
    }));
  }

  function toggleSoundMuted() {
    setState((current) => ({
      ...current,
      soundMuted: !(current.soundMuted ?? false),
    }));
  }

  function updateWeeklyExerciseGoal(nextGoal: number) {
    setState((current) => ({
      ...current,
      weeklyExerciseGoal: normalizeWeeklyGoal(nextGoal),
    }));
  }

  function switchGroup(groupId: string) {
    if (!joinedGroupIds.includes(groupId)) {
      setSettingsFeedback("先加入这个群组，再切换查看。");
      return;
    }
    setState((current) => ({
      ...current,
      currentGroupId: groupId,
    }));
    setSelectedRecordUserId("me");
    setShowAllMealHistory(false);
  }

  function createGroup() {
    if (!state.isAdmin) {
      setSettingsFeedback("创建群组暂时由管理员处理。");
      return;
    }
    const name = newGroupName.trim().slice(0, 10);
    if (!name) {
      setSettingsFeedback("先给群组起一个名字。");
      return;
    }
    const id = `group-${Date.now().toString(36)}`;
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    setState((current) => ({
      ...current,
      currentGroupId: id,
      groupIds: Array.from(new Set([...normalizeUserGroupIds(current.groupIds), id])),
      groups: [
        ...(current.groups?.length ? current.groups : defaultGroups),
        { id, name, code },
      ],
    }));
    setSelectedRecordUserId("me");
    setNewGroupName("");
    setSettingsFeedback(`已创建「${name}」，邀请码 ${code}。`);
  }

  function joinGroup() {
    const code = joinGroupCode.trim().toUpperCase();
    const foundGroup = groups.find((group) => group.code.toUpperCase() === code);
    if (!foundGroup) {
      setSettingsFeedback("没有找到这个邀请码，先确认一下大小写和数字。");
      return;
    }
    setState((current) => ({
      ...current,
      currentGroupId: foundGroup.id,
      groupIds: Array.from(new Set([...normalizeUserGroupIds(current.groupIds), foundGroup.id])),
    }));
    setSelectedRecordUserId("me");
    setShowAllMealHistory(false);
    setJoinGroupCode("");
    setSettingsFeedback(`已加入并切换到「${foundGroup.name}」。`);
  }

  function leaveGroup(groupId: string) {
    const targetGroup = groups.find((group) => group.id === groupId);
    if (!targetGroup || targetGroup.isPersonal) {
      setSettingsFeedback("个人手帐不能退出。");
      return;
    }
    setState((current) => {
      const nextGroupIds = normalizeUserGroupIds(current.groupIds).filter((id) => id !== groupId);
      return {
        ...current,
        groupIds: nextGroupIds,
        currentGroupId: current.currentGroupId === groupId ? "personal" : current.currentGroupId,
      };
    });
    setSelectedRecordUserId("me");
    setShowAllMealHistory(false);
    setSettingsFeedback(`已退出「${targetGroup.name}」。`);
  }

  function saveExercise(photo?: string) {
    const alreadyRewardedToday = (state.exercisePointDates ?? []).includes(todayKey);
    setState((current) => ({
      ...current,
      points: current.isAdmin
        ? current.points
        : (current.points ?? 0) + ((current.exercisePointDates ?? []).includes(todayKey) ? 0 : exercisePointReward),
      exercisePointDates: (current.exercisePointDates ?? []).includes(todayKey)
        ? current.exercisePointDates
        : [...(current.exercisePointDates ?? []), todayKey],
      exerciseEntries: [
        ...current.exerciseEntries.filter((entry) => entry.date !== todayKey),
        {
          date: todayKey,
          tag: selectedExerciseTag,
          duration: selectedDuration,
          intensity: selectedIntensity,
          photo,
          photoStatus: photo ? "pending" : undefined,
        },
      ],
      exercisePhotos: photo
        ? {
            ...(current.exercisePhotos ?? {}),
            [todayKey]: photo,
          }
        : current.exercisePhotos,
    }));
    showSuccess(
      `今天完成 ${selectedExerciseTag} ${selectedDuration} 分钟，${alreadyRewardedToday ? "今日积分已领取" : `获得 ${exercisePointReward} 积分`}，本周运动 ${Math.min(weekEntries.length + 1, weeklyExerciseGoal)}/${weeklyExerciseGoal}。`,
    );
  }

  async function handleExercisePhoto(file: File | undefined) {
    if (!file) return;
    try {
      const photo = await compressPhotoFile(file, 900, 0.72);
      saveExercise(photo);
    } catch {
      setSettingsFeedback("这张照片暂时无法读取，换一张图片再试试。");
    }
  }

  function takeLeave(reason: string) {
    setState((current) => ({
      ...current,
      exerciseEntries: [
        ...current.exerciseEntries.filter((entry) => entry.date !== todayKey),
        { date: todayKey, tag: "休息", duration: 0, intensity: "轻松", leaveReason: reason },
      ],
      exercisePhotos: Object.fromEntries(
        Object.entries(current.exercisePhotos ?? {}).filter(([dateKey]) => dateKey !== todayKey),
      ),
    }));
    showSuccess(`今天贴上「${reason}」休息贴纸，连续记录不会断。`);
  }

  function toggleMealLogged(mealId: MealKey) {
    setState((current) => ({
      ...current,
      meals: current.meals.map((meal) => (meal.id === mealId ? { ...meal, logged: !meal.logged } : meal)),
    }));
  }

  function selectMealField(mealId: MealKey, field: MealFieldKey) {
    setSelectedMealField(field);
    setState((current) => ({
      ...current,
      meals: current.meals.map((meal) => {
        if (meal.id !== mealId) return meal;
        if (field === "milkTea") return { ...meal, logged: true, milkTea: true, fruitTea: false };
        if (field === "fruitTea") return { ...meal, logged: true, fruitTea: true, milkTea: false };
        return { ...meal, logged: true, [field]: true };
      }),
    }));
  }

  function updateMealNote(mealId: MealKey, field: MealFieldKey, value: string) {
    setState((current) => ({
      ...current,
      meals: current.meals.map((meal) => {
        if (meal.id !== mealId) return meal;
        if (field === "milkTea") return { ...meal, logged: true, milkTea: true, fruitTea: false };
        if (field === "fruitTea") return { ...meal, logged: true, fruitTea: true, milkTea: false };
        return { ...meal, logged: true, [field]: true };
      }),
      mealNotes: {
        ...(current.mealNotes ?? {}),
        [mealId]: {
          ...(current.mealNotes?.[mealId] ?? {}),
          [field]: value,
        },
      },
    }));
  }

  function clearMealNote(mealId: MealKey, field: MealFieldKey) {
    setState((current) => ({
      ...current,
      meals: current.meals.map((meal) => (meal.id === mealId ? { ...meal, [field]: false } : meal)),
      mealNotes: {
        ...(current.mealNotes ?? {}),
        [mealId]: {
          ...(current.mealNotes?.[mealId] ?? {}),
          [field]: "",
        },
      },
    }));
  }

  async function handleMealPhoto(mealId: MealKey, file: File | undefined) {
    if (!file) return;
    try {
      const photo = await compressPhotoFile(file, 900, 0.72);
      setState((current) => ({
        ...current,
        meals: current.meals.map((meal) => (meal.id === mealId ? { ...meal, logged: true } : meal)),
        mealPhotos: {
          ...(current.mealPhotos ?? {}),
          [mealId]: photo,
        },
      }));
    } catch {
      setSettingsFeedback("这张餐食照片暂时无法读取，换一张图片再试试。");
    }
  }

  function completeDietDay() {
    const alreadyRewarded = (state.mealRewardDates ?? []).includes(todayKey);
    const shouldReward = dietScore === 100 && !alreadyRewarded;
    setState((current) => ({
      ...current,
      points: current.isAdmin ? current.points : (current.points ?? 0) + (shouldReward ? perfectMealPointReward : 0),
      mealRewardDates: shouldReward ? [...(current.mealRewardDates ?? []), todayKey] : current.mealRewardDates,
      mealHistory: {
        ...(current.mealHistory ?? {}),
        [todayKey]: {
          date: todayKey,
          meals: current.meals.map((meal) => ({ ...meal })),
          mealPhotos: { ...(current.mealPhotos ?? {}) },
          mealNotes: { ...(current.mealNotes ?? {}) },
          score: getDietScore(current.meals),
          loggedMealCount: current.meals.filter((meal) => meal.logged).length,
        },
      },
    }));
    showSuccess(
      shouldReward
        ? `今天记录了 ${loggedMealCount}/4 餐，餐盘分 100，获得 ${perfectMealPointReward} 积分。`
        : `今天记录了 ${loggedMealCount}/4 餐，健康餐盘分数 ${dietScore}%。`,
    );
  }

  function choosePlate(plateId: string) {
    setState((current) => ({
      ...current,
      selectedPlate: plateId,
    }));
    setShowPlatePicker(false);
  }

  function chooseMascot(mascotId: string) {
    const nextMascot = mascotOptions.find((option) => option.id === mascotId);
    if (!nextMascot) return;
    if (state.mascot === mascotId) {
      setSettingsFeedback(`现在使用的就是「${nextMascot.label}」。`);
      setShowMascotPicker(false);
      return;
    }

    if (!state.mascotClaimed) {
      setState((current) => ({
        ...current,
        mascot: mascotId,
        mascotClaimed: true,
      }));
      setSettingsFeedback(`已换成「${nextMascot.label}」。`);
      setShowMascotPicker(false);
      return;
    }

    if (!state.isAdmin && (state.points ?? 0) < mascotChangeCost) {
      setSettingsFeedback(`更换形象需要 ${mascotChangeCost} 积分，你现在有 ${state.points ?? 0} 积分。`);
      return;
    }

    setState((current) => ({
      ...current,
      mascot: mascotId,
      points: current.isAdmin ? current.points : Math.max((current.points ?? 0) - mascotChangeCost, 0),
    }));
    setSettingsFeedback(state.isAdmin ? `已换成「${nextMascot.label}」。` : `已扣除 ${mascotChangeCost} 积分，换成「${nextMascot.label}」。`);
    setShowMascotPicker(false);
  }

  function handleSettingsAction(item: string) {
    const feedback: Record<string, string> = {
      账号设置: "登录后会同步昵称、积分、形象和打卡记录。",
      首页管理: "这里管理首页展示的打卡类目和隐藏工具。",
      积分与兑换: "后续放餐盘、形象和其他奖励的积分兑换。",
      提醒设置: "运动连续 3 天未打卡会提醒，并进入小猪状态。",
      数据与隐私: "这里放记录导出、清除数据和隐私说明。",
    };
    setSettingsFeedback(feedback[item] ?? "这个入口后续会继续细化。");
  }

  function updateNickname(value: string) {
    setState((current) => ({
      ...current,
      nickname: value.slice(0, 8),
    }));
  }

  function toggleVisibility() {
    setState((current) => ({
      ...current,
      visibility: current.visibility === "public" ? "private" : "public",
    }));
  }

  function adjustUserPoints(direction: 1 | -1) {
    if (!state.isAdmin) return;
    const amount = Math.max(0, Math.floor(adminPointAmount));
    setState((current) => {
      if (adminTargetUserId === "me") {
        return {
          ...current,
          points: Math.max(0, (current.points ?? 0) + direction * amount),
        };
      }

      return {
        ...current,
        users: (current.users ?? []).map((user) => (
          user.id === adminTargetUserId
            ? { ...user, points: Math.max(0, user.points + direction * amount) }
            : user
        )),
      };
    });
  }

  function reviewExercisePhoto(ownerId: string, date: string, status: PhotoStatus) {
    if (!state.isAdmin) return;
    setState((current) => {
      if (ownerId === "me") {
        const wasRewarded = (current.exercisePointDates ?? []).includes(date);
        const previousEntry = current.exerciseEntries.find((entry) => entry.date === date);
        const shouldRestorePoints = status === "approved" && previousEntry?.photoStatus === "rejected" && !wasRewarded && !current.isAdmin;
        return {
          ...current,
          points: status === "rejected" && wasRewarded && !current.isAdmin
            ? Math.max((current.points ?? 0) - exercisePointReward, 0)
            : shouldRestorePoints
              ? (current.points ?? 0) + exercisePointReward
              : current.points,
          exercisePointDates: status === "rejected"
            ? (current.exercisePointDates ?? []).filter((item) => item !== date)
            : shouldRestorePoints
              ? [...(current.exercisePointDates ?? []), date]
              : current.exercisePointDates,
          exerciseEntries: current.exerciseEntries.map((entry) => (
            entry.date === date ? { ...entry, photoStatus: status } : entry
          )),
        };
      }

      return {
        ...current,
        users: (current.users ?? []).map((user) => {
          if (user.id !== ownerId) return user;
          const previousEntry = user.exerciseEntries.find((entry) => entry.date === date);
          const shouldRemovePoints = status === "rejected" && previousEntry?.photoStatus !== "rejected";
          const shouldRestorePoints = status === "approved" && previousEntry?.photoStatus === "rejected";
          return {
            ...user,
            points: shouldRemovePoints
              ? Math.max(user.points - exercisePointReward, 0)
              : shouldRestorePoints
                ? user.points + exercisePointReward
                : user.points,
            exerciseEntries: user.exerciseEntries.map((entry) => (
              entry.date === date ? { ...entry, photoStatus: status } : entry
            )),
          };
        }),
      };
    });
    setSettingsFeedback(status === "rejected" ? "已否认这张打卡照片，并扣回对应运动积分。" : "已通过这张打卡照片。");
  }

  return (
    <main
      className={`app-canvas bg-${currentBackground.id} text-size-${currentTextSize.id}`}
      style={{ "--font-enjoyable": currentHeadingFont.cssValue, "--font-influencer": currentBodyFont.cssValue } as CSSProperties}
      onClickCapture={handleAppClick}
    >
      <audio ref={bgmRef} src="/checkin-assets/bgm.wav" loop preload="auto" />
      <audio ref={clickAudioRef} src="/checkin-assets/click.wav" preload="auto" />
      <section className="phone journal-phone" aria-label="小柴打卡手帐">
        <header className="status-bar" aria-label="手机状态">
          <span>{statusBarTime}</span>
          <span aria-hidden="true">▮▮</span>
        </header>
        {state.onboarded && (
          <button
            className={soundMuted ? "sound-toggle muted" : "sound-toggle"}
            type="button"
            onClick={toggleSoundMuted}
            aria-label={soundMuted ? "打开背景音乐" : "静音背景音乐"}
          >
            ♪
          </button>
        )}

        {state.onboarded && view !== "home" && (
          <button className="back-button" type="button" onClick={() => setView("home")} aria-label="返回首页">
            ‹
          </button>
        )}

        {!state.onboarded && (
          <section className="screen onboarding-screen">
            <section className="onboarding-card">
              <span className="sticker-tape" aria-hidden="true" />
              <div>
                <span className="eyebrow">第一次进入</span>
                <h1>先认领你的健康手帐</h1>
                <p>填写用户名，选一个形象。第一次选择免费，之后更换形象需要 {mascotChangeCost} 积分。</p>
              </div>
              <label className="nickname-editor onboarding-name" htmlFor="onboarding-name">
                <small>用户名</small>
                <input
                  id="onboarding-name"
                  maxLength={12}
                  type="text"
                  value={onboardingName}
                  onChange={(event) => setOnboardingName(event.target.value)}
                  placeholder="比如 柴犬同学"
                />
              </label>
              {onboardingName.trim().toLowerCase() === adminAccount.username && (
                <label className="nickname-editor onboarding-name" htmlFor="admin-password">
                  <small>管理员密码</small>
                  <input
                    id="admin-password"
                    type="password"
                    value={adminPasswordInput}
                    onChange={(event) => setAdminPasswordInput(event.target.value)}
                    placeholder="输入管理员密码"
                  />
                </label>
              )}
              <div className="onboarding-mascots" aria-label="选择形象">
                {mascotOptions.map((option) => (
                  <button
                    className={`mascot-option mascot-option-${option.id}${onboardingMascot === option.id ? " active" : ""}`}
                    key={option.id}
                    type="button"
                    onClick={() => setOnboardingMascot(option.id)}
                  >
                    <Image src={option.image} width={1000} height={1000} alt="" unoptimized />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
              <button className="primary-sticker onboarding-submit" type="button" onClick={completeOnboarding}>
                开始使用
              </button>
              {settingsFeedback && <p className="settings-feedback">{settingsFeedback}</p>}
            </section>
          </section>
        )}

        {state.onboarded && view === "home" && (
          <section className="screen home-screen">
            <section className="hero-sheet" aria-label="今日健康总览">
              <div className="hero-copy">
                <span className="eyebrow">{todayLabel} · 健康小手帐</span>
                <div className="daily-title-row">
                  <h1>
                    {dailyTitleLines.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </h1>
                  <button type="button" onClick={changeDailyQuote} aria-label="换一句首页文案">换</button>
                </div>
                <p>{dailyQuote.body}</p>
              </div>
              <div className="hero-dog" aria-hidden="true">
                <Image src={displayMascot.image} width={1000} height={1000} alt="" priority unoptimized />
                <span className="hero-name">{userNickname}</span>
              </div>
            </section>

            {isPigReminder && (
              <section className="reminder-sheet" aria-label="运动提醒">
                <strong>连续 {missedExerciseDays} 天没运动啦</strong>
                <span>先做一次 30 分钟轻松运动，小猪状态就会恢复成你的形象。</span>
                <button type="button" onClick={() => setView("exercise")}>去运动</button>
              </section>
            )}

            <section className="core-notebook" aria-label="核心健康手帐">
              <section className="core-grid" aria-label="核心健康功能">
                <button className="core-card exercise" type="button" onClick={() => setView("exercise")}>
                  <span className="core-tape" aria-hidden="true" />
                  <span className="core-stamp">+{exercisePointReward} 分</span>
                  <Image src="/checkin-assets/gym.png" width={1000} height={1000} alt="" />
                  <small>运动打卡</small>
                  <strong>本周 {exerciseProgress}/{weeklyExerciseGoal} 次</strong>
                  <em>{todayExercise?.leaveReason ? "今天已请假" : todayExercise ? `${todayExercise.tag} 已记录` : "今天还没动起来"}</em>
                  <span className="core-progress" aria-hidden="true">
                    <i style={{ width: `${(exerciseProgress / weeklyExerciseGoal) * 100}%` }} />
                  </span>
                </button>

                <button className="core-card diet" type="button" onClick={() => setView("diet")}>
                  <span className="core-tape blue" aria-hidden="true" />
                  <span className="core-stamp blue">{dietScore}%</span>
                  <Image src="/checkin-assets/meal.png" width={1000} height={1000} alt="" />
                  <small>饮食记录</small>
                  <strong>{loggedMealCount}/4 餐</strong>
                  <em>餐盘分数 {dietScore}%</em>
                  <span className="core-progress blue" aria-hidden="true">
                    <i style={{ width: `${dietScore}%` }} />
                  </span>
                </button>
              </section>
            </section>

            <section className="advice-sheet exercise-entry-sheet" aria-label="今日运动打卡入口">
              <div className="board-heading">
                <div>
                  <span>今日运动</span>
                  <h2>完成一次活动</h2>
                </div>
                <button type="button" onClick={() => setView("exercise")}>打卡</button>
              </div>
              <p>{todayExercise ? `今天已经记录 ${todayExercise.tag}，本周完成 ${exerciseProgress}/${weeklyExerciseGoal} 次。` : `游泳、攀岩、健身、瑜伽都算运动，本周先完成 ${weeklyExerciseGoal} 次。`}</p>
            </section>

            <section className="advice-sheet" aria-label="今日健康建议">
              <div className="board-heading">
                <div>
                  <span>今日小建议</span>
                  <h2>{dailyFoodAdvice.title}</h2>
                </div>
                <button type="button" onClick={() => setView("diet")}>记录</button>
              </div>
              <p>{dailyFoodAdvice.body}</p>
            </section>

            <div className="background-switcher theme-ribbon" aria-label="更换手绘格纹背景">
              {backgroundOptions.map((option) => (
                <button
                  aria-label={`切换到${option.label}背景`}
                  className={currentBackground.id === option.id ? "active" : ""}
                  key={option.id}
                  type="button"
                  onClick={() => changeBackground(option.id)}
                >
                  <span className={`bg-dot ${option.id}`} aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        )}

        {state.onboarded && view === "exercise" && (
          <section className="screen exercise-screen">
            <div className="center-title">运动打卡</div>
            <section className="detail-sheet exercise-detail">
              <span className="sticker-tape" aria-hidden="true" />
              <Image src={selectedExerciseArt} width={1000} height={1000} alt="" />
              <p>目标是一周至少运动 {weeklyExerciseGoal} 次。游泳、攀岩、健身、瑜伽、徒步、跳操都算，照顾身体也算认真生活。</p>
              <strong>本周 {exerciseProgress}/{weeklyExerciseGoal} 次</strong>
            </section>

            <section className="choice-sheet" aria-label="选择运动类型">
              <h2>今天做了什么？</h2>
              <div className="tag-grid">
                {exerciseTags.map((tag) => (
                  <button className={selectedExerciseTag === tag ? "active" : ""} key={tag} type="button" onClick={() => setSelectedExerciseTag(tag)}>
                    {tag}
                  </button>
                ))}
              </div>
            </section>

            <section className="choice-sheet two-column" aria-label="选择时长和强度">
              <div>
                <h2>时长</h2>
                <div className="tag-grid small">
                  {durationOptions.map((duration) => (
                    <button
                      className={!showCustomDuration && selectedDuration === duration ? "active" : ""}
                      key={duration}
                      type="button"
                      onClick={() => {
                        setShowCustomDuration(false);
                        setSelectedDuration(duration);
                      }}
                    >
                      {duration} 分钟
                    </button>
                  ))}
                  <button
                    className={showCustomDuration ? "active" : ""}
                    type="button"
                    onClick={() => {
                      setShowCustomDuration(true);
                      setCustomDurationInput(
                        durationOptions.includes(selectedDuration) ? "" : `${selectedDuration}`
                      );
                    }}
                  >
                    自定义
                  </button>
                </div>
                {showCustomDuration && (
                  <div className="custom-duration-input">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={600}
                      placeholder="输入分钟数"
                      value={customDurationInput}
                      onChange={(event) => {
                        const raw = event.target.value;
                        setCustomDurationInput(raw);
                        const parsed = Number.parseInt(raw, 10);
                        if (Number.isFinite(parsed) && parsed > 0) {
                          setSelectedDuration(Math.min(parsed, 600));
                        }
                      }}
                    />
                    <span>分钟</span>
                  </div>
                )}
              </div>
              <div>
                <h2>强度</h2>
                <div className="tag-grid small">
                  {intensities.map((intensity) => (
                    <button className={selectedIntensity === intensity ? "active" : ""} key={intensity} type="button" onClick={() => setSelectedIntensity(intensity)}>
                      {intensity}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <div className="exercise-cta-row">
              <button className="primary-sticker passive" type="button" onClick={() => document.getElementById("exercise-photo-input")?.click()}>
                需要拍照打卡
              </button>
              <label className={todayExercisePhoto ? "mini-photo has-photo" : "mini-photo"} htmlFor="exercise-photo-input">
                {todayExercisePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={todayExercisePhoto} alt="" />
                ) : (
                  <Image src={selectedExerciseArt} width={1000} height={1000} alt="" />
                )}
                <span>{todayExercisePhoto ? "已拍照" : "拍照打卡"}</span>
              </label>
              <input
                accept="image/*"
                capture="environment"
                className="photo-input"
                id="exercise-photo-input"
                type="file"
                onChange={(event) => handleExercisePhoto(event.target.files?.[0])}
              />
            </div>

            <section className="leave-sheet" aria-label="身体状态请假">
              <h2>今天需要休息？</h2>
              <p>生理期、身体不适或受伤恢复可以请假。请假不加分，但不会打断连续记录。</p>
              <div className="tag-grid leave">
                {leaveReasons.map((reason) => (
                  <button key={reason} type="button" onClick={() => takeLeave(reason)}>
                    {reason}
                  </button>
                ))}
              </div>
            </section>
          </section>
        )}

        {state.onboarded && view === "diet" && (
          <section className="screen diet-screen">
            <div className="center-title">饮食记录</div>

            <section className="food-hero" aria-label="今日餐盘总览">
              <div>
                <span>今日餐盘 · {loggedMealCount}/4</span>
                <h1>{selectedMeal.label}</h1>
                <p>{selectedMealPhoto ? "这餐已经放进餐盘啦。" : "把饭放进盘子里，拍一张就好。"}</p>
              </div>
              <button className="plate-shop-button" type="button" onClick={() => setShowPlatePicker(true)}>
                换餐盘
              </button>
              <div className="plate-preview" aria-label="当前餐盘">
                <span className="mini-plate">
                  <Image className="mini-plate-base" src={selectedPlate.image} width={1000} height={1000} alt="" />
                  <span className="mini-plate-food">
                    {selectedMealPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="meal-photo-crop" src={selectedMealPhoto} alt="" />
                    ) : null}
                  </span>
                </span>
                <strong>{dietScore}</strong>
                <small>餐盘分</small>
              </div>
            </section>

            <section className="meal-switch" aria-label="选择餐次">
              {state.meals.map((meal) => (
                <button
                  className={selectedMeal.id === meal.id ? "active" : ""}
                  key={meal.id}
                  type="button"
                  onClick={() => setSelectedMealId(meal.id)}
                >
                  {meal.label}
                  {meal.logged && <i aria-hidden="true" />}
                </button>
              ))}
            </section>

            <section className={selectedMeal.logged ? "meal-editor logged" : "meal-editor"} aria-label={`${selectedMeal.label}记录`}>
              <div className="meal-plate-stage">
                <span className="plate-rim" aria-hidden="true">
                  <Image src={selectedPlate.image} width={1000} height={1000} alt="" />
                </span>
                <label className="plate-food" htmlFor={`meal-photo-${selectedMeal.id}`} aria-label={`上传${selectedMeal.label}照片`}>
                  {selectedMealPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="meal-photo-crop" src={selectedMealPhoto} alt="" />
                  ) : null}
                </label>
                <span className="meal-annotations" aria-hidden="true">
                  {mealAnnotations.map((annotation, index) => (
                    <span className={`meal-callout ${annotation.field} slot-${index + 1}`} key={annotation.field}>
                      <i />
                      <b>{annotation.label}</b>
                      <em>{annotation.text}</em>
                    </span>
                  ))}
                </span>
                {drinkNotes.length > 0 && (
                  <span className="meal-side-drinks" aria-hidden="true">
                    {drinkNotes.map((drink) => (
                      <span className={`side-drink ${drink.field === "fruitTea" ? "fruit-tea" : "milk-tea"}`} key={drink.field}>
                        <Image
                          className="drink-cup-image"
                          src={drinkAssets[drink.field].image}
                          width={860}
                          height={1184}
                          alt=""
                        />
                        <em>{drink.label}</em>
                      </span>
                    ))}
                  </span>
                )}
                <label className="plate-action" htmlFor={`meal-photo-${selectedMeal.id}`}>{selectedMealPhoto ? "换图" : "拍照"}</label>
              </div>
              <input
                accept="image/*"
                capture="environment"
                className="photo-input"
                id={`meal-photo-${selectedMeal.id}`}
                type="file"
                onChange={(event) => handleMealPhoto(selectedMeal.id, event.target.files?.[0])}
              />

              <div className="meal-editor-copy">
                <span>{selectedMeal.logged ? "已加入今日餐盘" : "待记录"}</span>
                <h2>{selectedMeal.label}</h2>
                <p>{dietTip}</p>
              </div>

              <div className="meal-tags">
                {mealFields.map(([field, label]) => (
                  <button
                    className={[selectedMeal[field] ? "active" : "", selectedMealField === field ? "editing" : ""].join(" ")}
                    key={field}
                    type="button"
                    onClick={() => selectMealField(selectedMeal.id, field)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="meal-note-editor">
                <label htmlFor={`meal-note-${selectedMeal.id}-${selectedMealField}`}>
                  <span>{selectedMealField === "milkTea" || selectedMealField === "fruitTea" ? "今天喝的啥？" : `${selectedMealFieldMeta[1]}写点什么？`}</span>
                  <input
                    id={`meal-note-${selectedMeal.id}-${selectedMealField}`}
                    type="text"
                    value={selectedMealNotes[selectedMealField] ?? ""}
                    placeholder={selectedMealFieldMeta[2]}
                    onChange={(event) => updateMealNote(selectedMeal.id, selectedMealField, event.target.value)}
                  />
                </label>
                <button type="button" onClick={() => clearMealNote(selectedMeal.id, selectedMealField)}>
                  清空
                </button>
              </div>

              <button className="meal-done-toggle" type="button" onClick={() => toggleMealLogged(selectedMeal.id)}>
                {selectedMeal.logged ? "取消这餐记录" : "先标记已吃"}
              </button>
            </section>

            <section className="meal-album" aria-label="今日餐盘相册">
              {state.meals.map((meal) => {
                const mealDrink = meal.fruitTea ? "fruitTea" : meal.milkTea ? "milkTea" : null;
                return (
                  <button className={selectedMeal.id === meal.id ? "active" : ""} key={meal.id} type="button" onClick={() => setSelectedMealId(meal.id)}>
                    <span className="album-plate">
                      <Image className="album-plate-base" src={selectedPlate.image} width={1000} height={1000} alt="" />
                      <span className="album-plate-food">
                        {mealPhotos[meal.id] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="meal-photo-crop" src={mealPhotos[meal.id]} alt="" />
                        ) : null}
                      </span>
                      {mealDrink && (
                        <span className={`album-drink-mark ${mealDrink === "fruitTea" ? "fruit-tea" : "milk-tea"}`} aria-hidden="true">
                          <Image src={drinkAssets[mealDrink].image} width={860} height={1184} alt="" />
                        </span>
                      )}
                    </span>
                    <span>{meal.label}</span>
                  </button>
                );
              })}
            </section>

            <button className="primary-sticker meal-save-button" type="button" onClick={completeDietDay}>保存今日餐盘</button>

            {showPlatePicker && (
              <section className="plate-picker" aria-label="选择餐盘">
                <button className="plate-picker-backdrop" type="button" aria-label="关闭餐盘选择" onClick={() => setShowPlatePicker(false)} />
                <div className="plate-picker-sheet">
                  <div className="plate-picker-head">
                    <div>
                      <span>餐盘收藏</span>
                      <h2>选择一个餐盘</h2>
                    </div>
                    <button type="button" onClick={() => setShowPlatePicker(false)} aria-label="关闭">×</button>
                  </div>
                  <div className="plate-options">
                    {plateOptions.map((plate) => (
                      <button className={selectedPlate.id === plate.id ? "active" : ""} key={plate.id} type="button" onClick={() => choosePlate(plate.id)}>
                        <Image src={plate.image} width={1000} height={1000} alt="" />
                        <strong>{plate.label}</strong>
                        <span>{plate.price}</span>
                      </button>
                    ))}
                  </div>
                  <p>后面这里可以接入打卡积分兑换，也可以加入充值积分。</p>
                </div>
              </section>
            )}
          </section>
        )}

        {state.onboarded && view === "records" && (
          <section className="screen records-screen">
            <div className="center-title">健康记录</div>
            <section className="records-hero-card" aria-label="打开健康记录">
              <div>
                <span>打开记录</span>
                <h2>{selectedRecordUser.nickname} 的手帐</h2>
                <p>{selectedRecordVisible ? "运动、餐食和请假都会收在这里。" : "这位用户选择隐藏记录，只保留排行榜展示。"}</p>
              </div>
              <Image src="/checkin-assets/open-record.png" width={1000} height={1000} alt="" />
            </section>
            <section className="record-user-switch" aria-label="选择查看用户">
              {recordUsers.map((user) => (
                <button
                  className={selectedRecordUser.id === user.id ? "active" : ""}
                  key={user.id}
                  type="button"
                  onClick={() => {
                    setSelectedRecordUserId(user.id);
                    setShowAllMealHistory(false);
                  }}
                >
                  <Image className="record-user-avatar" src={user.mascot} width={120} height={120} alt="" unoptimized />
                  <span>{user.isCurrent ? "我" : user.nickname}</span>
                  <small>{user.visibility === "public" || user.isCurrent || state.isAdmin ? "可看" : "隐藏"}</small>
                </button>
              ))}
            </section>
            <section className="record-strip">
              <article>
                <span>运动记录</span>
                <strong>{selectedRecordVisible ? selectedRecordUser.exerciseEntries.length : "-"}</strong>
              </article>
              <article>
                <span>餐食记录</span>
                <strong>{selectedRecordVisible ? Object.keys(selectedRecordUser.mealHistory).length : "-"}</strong>
              </article>
              <article>
                <span>公开状态</span>
                <strong>{selectedRecordUser.visibility === "public" ? "公开" : "隐藏"}</strong>
              </article>
            </section>

            {selectedRecordVisible ? (
              <>
                {selectedRecordUser.isCurrent && (
                  <section className="records-meal-gallery" aria-label="今日餐食打卡图片">
                    <div className="record-mini-heading">
                      <span>今日餐食</span>
                      <strong>{loggedMealCount}/4 餐</strong>
                    </div>
                    <div className="records-meal-row">
                      {state.meals.map((meal) => {
                        const mealDrink = meal.fruitTea ? "fruitTea" : meal.milkTea ? "milkTea" : null;
                        return (
                          <button
                            className={mealPhotos[meal.id] || meal.logged ? "has-photo" : ""}
                            key={meal.id}
                            type="button"
                            onClick={() => {
                              setSelectedMealId(meal.id);
                              setView("diet");
                            }}
                          >
                            <span className="album-plate" aria-hidden="true">
                              <Image className="album-plate-base" src={selectedPlate.image} width={1000} height={1000} alt="" />
                              <span className="album-plate-food">
                                {mealPhotos[meal.id] ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={mealPhotos[meal.id]} alt="" />
                                ) : null}
                              </span>
                              {mealDrink && (
                                <span className={`album-drink-mark ${mealDrink === "fruitTea" ? "fruit-tea" : "milk-tea"}`} aria-hidden="true">
                                  <Image src={drinkAssets[mealDrink].image} width={860} height={1184} alt="" />
                                </span>
                              )}
                            </span>
                            <span>{meal.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                <section className="history-sheet" aria-label="过往运动记录">
                  <div className="record-mini-heading">
                    <span>全部运动</span>
                    <strong>{selectedRecordExercises.length} 条</strong>
                  </div>
                  {selectedRecordExercises.length === 0 ? (
                    <p>还没有运动记录。完成一次运动打卡后，会按日期收在这里。</p>
                  ) : selectedRecordExercises.map((entry) => (
                    <article className={`history-entry ${entry.leaveReason ? "is-rest" : ""} ${entry.leaveReason ? "" : "has-exercise-photo"}`} key={`${entry.date}-${entry.tag}`}>
                      <span className="history-date">{entry.date.slice(5)}</span>
                      <div className="history-copy">
                        <strong>{entry.leaveReason ? `休息 · ${entry.leaveReason}` : `${entry.tag} ${entry.duration}分钟`}</strong>
                        {entry.photo && (
                          <span className={`photo-status ${entry.photoStatus ?? "pending"}`}>
                            {getPhotoStatusLabel(entry.photoStatus)} · 拍照已保存
                          </span>
                        )}
                      </div>
                      {!entry.leaveReason && (
                        entry.photo ? (
                          <button
                            className="exercise-photo-button"
                            type="button"
                            onClick={() => setExercisePhotoPreview({
                              src: entry.photo ?? "",
                              title: `${entry.tag} ${entry.duration}分钟`,
                              status: entry.photoStatus,
                              date: entry.date,
                            })}
                          >
                            照片
                          </button>
                        ) : (
                          <span className="exercise-photo-empty">无图</span>
                        )
                      )}
                      <em>{entry.leaveReason ? "休" : "动"}</em>
                    </article>
                  ))}
                </section>

                <section className="history-sheet" aria-label="过往餐食记录">
                  <div className="record-mini-heading">
                    <button type="button" onClick={() => setShowAllMealHistory((current) => !current)}>
                      {showAllMealHistory ? "收起餐食" : "全部餐食"}
                    </button>
                    <strong>{showAllMealHistory ? selectedRecordMeals.length : Math.min(selectedRecordMeals.length, 7)} / {selectedRecordMeals.length} 天</strong>
                  </div>
                  {selectedRecordMeals.length === 0 ? (
                    <p>还没有保存过餐盘。点击“保存今日餐盘”后，这一天会进入餐食历史。</p>
                  ) : displayedRecordMeals.map((mealDay) => (
                    <article className="history-entry meal-history-entry" key={mealDay.date}>
                      <span className="history-date">{mealDay.date.slice(5)}</span>
                      <div className="meal-history-body">
                        <div className="meal-history-plates">
                          {defaultMeals.map((mealBase) => {
                            const meal = mealDay.meals.find((item) => item.id === mealBase.id) ?? mealBase;
                            const mealDrink = meal.fruitTea ? "fruitTea" : meal.milkTea ? "milkTea" : null;
                            const savedPhoto = mealDay.mealPhotos?.[meal.id];
                            return (
                              <span className={meal.logged ? "meal-history-plate logged" : "meal-history-plate"} key={meal.id}>
                                <span className="album-plate" aria-hidden="true">
                                  <Image className="album-plate-base" src={selectedPlate.image} width={1000} height={1000} alt="" />
                                  <span className="album-plate-food">
                                    {savedPhoto ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={savedPhoto} alt="" />
                                    ) : null}
                                  </span>
                                  {mealDrink && (
                                    <span className={`album-drink-mark ${mealDrink === "fruitTea" ? "fruit-tea" : "milk-tea"}`} aria-hidden="true">
                                      <Image src={drinkAssets[mealDrink].image} width={860} height={1184} alt="" />
                                    </span>
                                  )}
                                </span>
                                <small>{meal.label}</small>
                              </span>
                            );
                          })}
                        </div>
                        <small className="meal-history-score">{mealDay.loggedMealCount}/4 餐 · {mealDay.score} 分{mealDay.score === 100 ? ` · +${perfectMealPointReward}积分` : ""}</small>
                      </div>
                    </article>
                  ))}
                </section>
              </>
            ) : (
              <section className="private-sheet">
                <strong>记录已隐藏</strong>
                <p>对方关闭了公开记录。管理员可以在管理面板中查看和调整积分。</p>
              </section>
            )}
          </section>
        )}

        {state.onboarded && view === "rank" && (
          <section className="screen rank-screen">
            <div className="center-title">小伙伴榜</div>
            <p className="group-context">{currentGroup.name} · 只显示本群成员</p>
            <section className={isSinglePodium ? "podium-card single" : "podium-card"} aria-label="本周运动前三名">
              <p>排行榜按本周运动次数计算。请假会保护连续记录，但不计入运动分数。</p>
              <div className={isSinglePodium ? "podium-stage single" : "podium-stage"}>
                <Image className="podium-base" src="/checkin-assets/rank-podium.png" width={1402} height={1122} alt="" />
                {podiumUsers.map((user) => (
                  <div className={`podium-user ${user.className}`} key={user.rank}>
                    <span className="podium-rank-badge">{user.rank}</span>
                    <span className="podium-avatar-frame">
                      <Image src={user.image} width={1000} height={1000} alt="" unoptimized />
                    </span>
                    <strong>{user.name}</strong>
                    <em>{user.count} 次</em>
                  </div>
                ))}
              </div>
            </section>
            <section className="rank-list" aria-label="运动排行榜">
              {rankRows.map(({ rank, name, value }) => (
                <article key={rank}>
                  <mark>{rank}</mark>
                  <span>{name}</span>
                  <strong>{value}</strong>
                </article>
              ))}
            </section>
          </section>
        )}

        {state.onboarded && view === "me" && (
          <section className="screen me-screen">
            <div className="center-title">我的</div>
            <section className="profile-sheet">
              <button className="profile-avatar-button" type="button" onClick={() => setShowMascotPicker(true)} aria-label="更换形象">
                <Image src={displayMascot.image} width={1000} height={1000} alt="" unoptimized />
                <small>换形象</small>
              </button>
              <div className="profile-copy">
                <h1>{userNickname}</h1>
                <label className="nickname-editor" htmlFor="nickname-input">
                  <small>昵称</small>
                  <input
                    id="nickname-input"
                    maxLength={8}
                    type="text"
                    value={state.nickname}
                    onChange={(event) => updateNickname(event.target.value)}
                    placeholder="输入昵称"
                  />
                </label>
                <div className="profile-meta">
                  <span>{displayPoints} 积分</span>
                  <span>本周 {exerciseProgress}/{weeklyExerciseGoal} 次</span>
                </div>
              </div>
            </section>

            <section className="points-sheet" aria-label="积分规则">
              <div className="point-rule-card">
                <span>运动打卡</span>
                <strong>+{exercisePointReward} 积分 / 天</strong>
              </div>
              <div className="point-rule-card">
                <span>餐盘满分</span>
                <strong>+{perfectMealPointReward} 积分</strong>
              </div>
              <div className="point-rule-card weekly-goal-card">
                <span>每周目标</span>
                <div className="goal-stepper" aria-label="设置每周运动目标">
                  <button type="button" onClick={() => updateWeeklyExerciseGoal(weeklyExerciseGoal - 1)} aria-label="减少每周目标">
                    -
                  </button>
                  <strong>{weeklyExerciseGoal} 次</strong>
                  <button type="button" onClick={() => updateWeeklyExerciseGoal(weeklyExerciseGoal + 1)} aria-label="增加每周目标">
                    +
                  </button>
                </div>
              </div>
              <em>连续 3 天未运动会提醒，并进入小猪状态。</em>
            </section>

            <section className="group-sheet" aria-label="群组与隐私">
              <div className="group-privacy-row">
                <div>
                  <span>我的运动和打卡记录是否本群可见？</span>
                  <strong>{state.visibility === "public" ? "本群可见" : "仅自己可见"}</strong>
                </div>
                <button className="group-pill-button" type="button" onClick={toggleVisibility}>
                  {state.visibility === "public" ? "设为隐藏" : "公开记录"}
                </button>
              </div>
              <div className="group-current">
                <div>
                  <span>当前群组</span>
                  <h2>{currentGroup.name}</h2>
                  <p>{currentGroup.isPersonal ? "个人群只显示自己的记录和榜单。" : "排行榜和公开记录只在本群内展示。"}</p>
                </div>
                <strong>{currentGroup.code}</strong>
              </div>
              <div className="group-switcher">
                {joinedGroups.map((group) => (
                  <div className="group-switcher-item" key={group.id}>
                    <button
                      className={currentGroup.id === group.id ? "active" : ""}
                      type="button"
                      onClick={() => switchGroup(group.id)}
                    >
                      {group.name}
                    </button>
                    {!group.isPersonal && (
                      <button className="group-exit-button" type="button" onClick={() => leaveGroup(group.id)}>
                        退出
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {state.isAdmin && (
                <div className="group-actions create">
                  <label htmlFor="new-group-name">
                    <small>创建群组</small>
                    <input
                      id="new-group-name"
                      maxLength={10}
                      type="text"
                      value={newGroupName}
                      onChange={(event) => setNewGroupName(event.target.value)}
                      placeholder="比如健身搭子"
                    />
                  </label>
                  <button className="group-pill-button" type="button" onClick={createGroup}>创建</button>
                </div>
              )}
              <div className="group-actions join">
                <label htmlFor="join-group-code">
                  <small>加入群组</small>
                  <input
                    id="join-group-code"
                    type="text"
                    value={joinGroupCode}
                    onChange={(event) => setJoinGroupCode(event.target.value)}
                    placeholder="输入邀请码"
                  />
                </label>
                <button className="group-pill-button" type="button" onClick={joinGroup}>加入</button>
              </div>
            </section>

            <section className="appearance-sheet" aria-label="外观设置">
              <div className="settings-block-heading">
                <h2>外观设置</h2>
                <p>字体看着累？换个自己顺眼的。</p>
              </div>
              <div className="appearance-row">
                <small>标题字体</small>
                <div className="font-select">
                  <button
                    className="font-select-trigger"
                    type="button"
                    onClick={() => setOpenFontMenu(openFontMenu === "heading" ? null : "heading")}
                  >
                    <small>{currentHeadingFont.label}</small>
                    <span style={{ fontFamily: currentHeadingFont.cssValue }}>{fontPreviewSample}</span>
                    <em aria-hidden="true">{openFontMenu === "heading" ? "▲" : "▼"}</em>
                  </button>
                  {openFontMenu === "heading" && (
                    <div className="font-select-menu" role="listbox">
                      {fontOptions.map((option) => (
                        <button
                          className={currentHeadingFont.id === option.id ? "active" : ""}
                          key={option.id}
                          type="button"
                          role="option"
                          aria-selected={currentHeadingFont.id === option.id}
                          onClick={() => {
                            changeHeadingFont(option.id);
                            setOpenFontMenu(null);
                          }}
                        >
                          <small>{option.label}</small>
                          <span style={{ fontFamily: option.cssValue }}>{fontPreviewSample}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="appearance-row">
                <small>正文字体</small>
                <div className="font-select">
                  <button
                    className="font-select-trigger"
                    type="button"
                    onClick={() => setOpenFontMenu(openFontMenu === "body" ? null : "body")}
                  >
                    <small>{currentBodyFont.label}</small>
                    <span style={{ fontFamily: currentBodyFont.cssValue }}>{fontPreviewSample}</span>
                    <em aria-hidden="true">{openFontMenu === "body" ? "▲" : "▼"}</em>
                  </button>
                  {openFontMenu === "body" && (
                    <div className="font-select-menu" role="listbox">
                      {fontOptions.map((option) => (
                        <button
                          className={currentBodyFont.id === option.id ? "active" : ""}
                          key={option.id}
                          type="button"
                          role="option"
                          aria-selected={currentBodyFont.id === option.id}
                          onClick={() => {
                            changeBodyFont(option.id);
                            setOpenFontMenu(null);
                          }}
                        >
                          <small>{option.label}</small>
                          <span style={{ fontFamily: option.cssValue }}>{fontPreviewSample}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="appearance-row">
                <small>字号</small>
                <div className="tag-grid small text-size-picker">
                  {textSizeOptions.map((option) => (
                    <button
                      className={currentTextSize.id === option.id ? "active" : ""}
                      key={option.id}
                      type="button"
                      onClick={() => changeTextSize(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {state.isAdmin && (
              <section className="admin-sheet" aria-label="管理员积分管理">
                <div className="record-mini-heading">
                  <span>管理员</span>
                  <strong>无限积分</strong>
                </div>
                <label>
                  <small>调整用户</small>
                  <select value={adminTargetUserId} onChange={(event) => setAdminTargetUserId(event.target.value)}>
                    <option value="me">管理员本人</option>
                    {(state.users ?? []).map((user) => (
                      <option key={user.id} value={user.id}>{user.nickname} · {user.points}分</option>
                    ))}
                  </select>
                </label>
                <label>
                  <small>积分数量</small>
                  <input
                    min={0}
                    step={5}
                    type="number"
                    value={adminPointAmount}
                    onChange={(event) => setAdminPointAmount(Number(event.target.value))}
                  />
                </label>
                <div className="admin-actions">
                  <button type="button" onClick={() => adjustUserPoints(1)}>加积分</button>
                  <button type="button" onClick={() => adjustUserPoints(-1)}>减积分</button>
                </div>
                <div className="admin-photo-review">
                  <div className="record-mini-heading">
                    <span>打卡照片审核</span>
                    <strong>{exercisePhotoReviews.length} 张</strong>
                  </div>
                  {exercisePhotoReviews.length === 0 ? (
                    <p>目前没有待查看的拍照打卡。</p>
                  ) : exercisePhotoReviews.slice(0, 6).map(({ ownerId, ownerName, entry }) => (
                    <article className="admin-review-item" key={`${ownerId}-${entry.date}`}>
                      <span className="admin-review-photo" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={entry.photo} alt="" />
                      </span>
                      <div>
                        <strong>{ownerName}</strong>
                        <small>{entry.date.slice(5)} · {entry.tag} · {getPhotoStatusLabel(entry.photoStatus)}</small>
                      </div>
                      <button type="button" onClick={() => reviewExercisePhoto(ownerId, entry.date, "approved")}>通过</button>
                      <button type="button" onClick={() => reviewExercisePhoto(ownerId, entry.date, "rejected")}>否认</button>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="settings-sheet">
              {["账号设置", "首页管理", "积分与兑换", "提醒设置", "数据与隐私"].map((item) => (
                <button key={item} type="button" onClick={() => handleSettingsAction(item)}>
                  <span>{item}</span>
                  <i>›</i>
                </button>
              ))}
            </section>
            {settingsFeedback && <p className="settings-feedback">{settingsFeedback}</p>}
          </section>
        )}

        {state.onboarded && view === "success" && (
          <section className="screen success-screen">
            <section className="success-sheet">
              <span className="sticker-tape" aria-hidden="true" />
              <Image className="success-main-art" src="/checkin-assets/success-shiba.png" width={1000} height={1000} alt="" priority={false} />
              <h1>贴好啦</h1>
              <p>{successText}</p>
              <div className="success-preview-grid" aria-label="今日打卡预览">
                <article className="success-preview-card">
                  <span>运动打卡</span>
                  <div className="success-photo-frame">
                    {todayExercisePhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={todayExercisePhoto} alt="" />
                    ) : (
                      <Image src={selectedExerciseArt} width={1000} height={1000} alt="" />
                    )}
                  </div>
                  <strong>{todayExercise?.tag ?? selectedExerciseTag}</strong>
                </article>
                <article className="success-preview-card">
                  <span>今日餐盘</span>
                  <div className="success-plate-preview" aria-hidden="true">
                    <Image className="success-plate-base" src={selectedPlate.image} width={1000} height={1000} alt="" />
                    <span className="success-plate-food">
                      {successMealPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={successMealPhoto} alt="" />
                      ) : null}
                    </span>
                    {successMealDrink && (
                      <span className={`success-drink-mark ${successMealDrink}`}>
                        <Image src={drinkAssets[successMealDrink].image} width={860} height={1184} alt="" />
                      </span>
                    )}
                  </div>
                  <strong>{successMeal.label}</strong>
                </article>
              </div>
              <div className="split-actions">
                <button type="button" onClick={() => setView("home")}>回首页</button>
                <button type="button" onClick={() => setView("records")}>看记录</button>
              </div>
            </section>
          </section>
        )}

        {state.onboarded && showMascotPicker && (
          <section className="mascot-picker" aria-label="更换形象">
            <button className="plate-picker-backdrop" type="button" aria-label="关闭形象选择" onClick={() => setShowMascotPicker(false)} />
            <div className="plate-picker-sheet mascot-picker-sheet">
              <div className="plate-picker-head">
                <div>
                  <span>形象选择</span>
                  <h2>选择你的形象</h2>
                </div>
                <button type="button" onClick={() => setShowMascotPicker(false)}>收起</button>
              </div>
              <div className="mascot-grid">
                {mascotOptions.map((option) => (
                  <button
                    className={`mascot-option mascot-option-${option.id}${state.mascot === option.id ? " active" : ""}`}
                    key={option.id}
                    type="button"
                    onClick={() => chooseMascot(option.id)}
                  >
                    <Image src={option.image} width={1000} height={1000} alt="" unoptimized />
                    <span>{option.label}</span>
                    <small>{state.mascot === option.id ? "使用中" : state.isAdmin ? "不限积分" : state.mascotClaimed ? `${mascotChangeCost}积分` : "可选"}</small>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {state.onboarded && exercisePhotoPreview && (
          <section className="exercise-photo-viewer" aria-label="查看运动打卡照片">
            <button
              className="plate-picker-backdrop"
              type="button"
              aria-label="关闭照片"
              onClick={() => setExercisePhotoPreview(null)}
            />
            <div className="exercise-photo-sheet">
              <div className="plate-picker-head">
                <div>
                  <span>{exercisePhotoPreview.date.slice(5)} · {getPhotoStatusLabel(exercisePhotoPreview.status)}</span>
                  <h2>{exercisePhotoPreview.title}</h2>
                </div>
                <button type="button" onClick={() => setExercisePhotoPreview(null)} aria-label="关闭">×</button>
              </div>
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={exercisePhotoPreview.src} alt="运动打卡照片" />
              </figure>
            </div>
          </section>
        )}

        {state.onboarded && <nav className="bottom-nav bottom-dock" aria-label="底部导航">
          <button className={view === "home" ? "active" : ""} type="button" onClick={() => setView("home")}>
            <span>⌂</span>首页
          </button>
          <button className={view === "records" ? "active" : ""} type="button" onClick={() => setView("records")}>
            <span>▣</span>记录
          </button>
          <button className={view === "rank" ? "active" : ""} type="button" onClick={() => setView("rank")}>
            <span>☆</span>排行
          </button>
          <button className={view === "me" ? "active" : ""} type="button" onClick={() => setView("me")}>
            <span className="nav-mascot">
              <Image src={displayMascot.image} width={1000} height={1000} alt="" unoptimized />
            </span>
            我的
          </button>
        </nav>}
      </section>
    </main>
  );
}
