import { Renderer } from "@k8slens/extensions";
import { DeploymentVersionUpdate } from "./src/deployment-version-update"
import { CronJobVersionUpdate } from "./src/cronjob-version-update"
import React from "react"

export default class VersionUpdateExtension extends Renderer.LensExtension {
  kubeObjectDetailItems = [
    {
      kind: "Deployment",
      apiVersions: ["apps/v1"],
      priority: 20,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<Renderer.K8sApi.Deployment>) => (<DeploymentVersionUpdate {...props} />)
      }
    },
    {
      kind: "CronJob",
      apiVersions: ["batch/v1"],
      priority: 20,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<Renderer.K8sApi.CronJob>) => (<CronJobVersionUpdate {...props} />)
      }
    }
  ]
}