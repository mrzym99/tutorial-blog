<script setup lang="ts">
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NNotificationProvider,
} from 'naive-ui'
import { useNaiveTheme } from './theme'

// 后台 UI 的配置/消息/对话框容器。所有 admin 页面用本组件包裹，
// 使 setup 内的 useMessage() / useDialog() 能正常取值。
const { activeTheme, themeOverrides } = useNaiveTheme()
</script>

<template>
  <n-config-provider :theme="activeTheme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <slot />
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>