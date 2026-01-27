import React from "react";

/**
 * @typedef {{ id: String, title: string, order: number, status?: string }} SLide
 * 
 * @param {{
 * slides: Slide[],
 * selectedSlideId?: string,
 * onSelect: (id: string) => void,
 * onAddSlide?: () => void,
 * onMoveSlide?: (id: string, direction: "up" | ) => void
 * }} props
 */
