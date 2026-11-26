import { useEffect, useState } from "react";
import { Button, IconButton } from "../../components/ui/Button";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { fetchApi } from "../../services/api";
import { userErrorMessage } from "../../services/apiError";

type Step = { name: string; standard_minutes: number; requires_photo?: boolean };

const clean = (steps: Step[]) => steps.map(step => ({ ...step, name: step.name.trim(), requires_photo: !!step.requires_photo }));

/** Lỗi của từng dòng: tên trống, trùng tên (không phân biệt hoa thường), phút ngoài 1–1440. */
function stepProblem(step: Step, index: number, steps: Step[]): string | null {
  const name = step.name.trim().toLocaleLowerCase("vi");
  if (!name) return "Nhập tên bước.";
  if (steps.findIndex(other => other.name.trim().toLocaleLowerCase("vi") === name) !== index) return "Tên bước bị trùng.";
  if (!Number.isInteger(step.standard_minutes) || step.standard_minutes < 1 || step.standard_minutes > 1440) return "Phút chuẩn phải từ 1 đến 1440.";
  return null;
}

/**