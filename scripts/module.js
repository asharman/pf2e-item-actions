const MODULE_ID = "pf2e-item-actions";

Hooks.on("ready", () => {
  console.log("Item Actions | Item Actions is running!");
  Hooks.on("updateItem", async (item, changes, diff, userID) => {
    if (skipUpdateItem(item, changes)) {
      return;
    }

    // held | worn
    const carryType = changes?.system?.equipped?.carryType ?? "worn";

    if (carryType === "held") {
      const actions = await extractActionsFromItem(item);
      const augmentedActions = actions.map((a) => {
        const actionObject = { ...a.toObject() };
        return setModuleFlag(actionObject, "grantedBy", item);
      });
      await item.actor.createEmbeddedDocuments("Item", augmentedActions);
    } else if (carryType === "worn") {
      const actionIds = item.actor.items
        .filter((it) => it?.flags?.[MODULE_ID]?.grantedBy._id === item.id)
        .map((a) => a._id);
      await item.actor.deleteEmbeddedDocuments("Item", actionIds);
    }
  });
});

function skipUpdateItem(item, changes) {
  return item.actor.type !== "character" || !changes?.system?.equipped;
}

async function extractActionsFromItem(item) {
  const regex = new RegExp(/(?<=@UUID\[)Item.*?(?=\])/g);

  const gmIds = String(item.system.description.gm).match(regex) ?? [];
  const descriptionIds =
    String(item.system.description.value).match(regex) ?? [];

  const itemIds = descriptionIds.concat(gmIds);

  return Promise.all(itemIds.map((uuid) => fromUuid(uuid)));
}

function setModuleFlag(item, flagName, value) {
  // Ensure item has a flags object
  if (!item?.flags) item.flags = {};

  // Ensure item has a flags object for the module
  if (!item?.flags?.[MODULE_ID]) item.flags[MODULE_ID] = {};

  // Set the value for the specified flag
  item.flags[MODULE_ID][flagName] = value;

  return item;
}
