import { Box, Group, Progress, Text } from "@mantine/core";

export interface StepInfo {
  key: string;
  title: string;
  description: string;
}

interface StepNavigationProps {
  steps: StepInfo[];
  currentStep: string;
  isContentStep?: boolean;
}

export const StepNavigation = ({ steps, currentStep, isContentStep = false }: StepNavigationProps) => {
  const getCurrentStepIndex = () => steps.findIndex((step) => step.key === currentStep);
  const getProgress = () => ((getCurrentStepIndex() + 1) / steps.length) * 100;

  return (
    <Box px={isContentStep ? 20 : 0} pt={isContentStep ? 20 : 0}>
      <Group justify="space-between" mb="xs">
        <Text size="sm" fw={500}>
          {steps[getCurrentStepIndex()].title}
        </Text>
        <Text size="xs" c="dimmed">
          {getCurrentStepIndex() + 1} / {steps.length}
        </Text>
      </Group>
      <Progress value={getProgress()} size="sm" />
      <Text size="xs" c="dimmed" mt="xs">
        {steps[getCurrentStepIndex()].description}
      </Text>
    </Box>
  );
};
