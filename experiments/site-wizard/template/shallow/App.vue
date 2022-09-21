<template>
  <div id="app">
    <ApiError v-if="apiState === 'error'">
      <MainLogo slot="brand" />
      <PageFooter slot="footer" />
    </ApiError>
  </div>
</template>

<script>
import { ApiError } from "@openlab/deconf-ui-toolkit";

export default {
  components: { ApiError },
};
</script>
