export default function SlideList({
    slides,
    selectedSlideId,
    onSelect }) {
    const sorted = [...(slides || [])].sort((a,b) => a.order - b.order);

    return (
        <div style={styles.wrapper}>
         <h3 style={{ marginTop: 0}}>Slides</h3>

         {sorted.length === 0 ? (
            <p>No slides yet.</p>
         ) : (
            <ul style={styles.list}>
                {sorted.map((slide, idx) => {
                    const isSelected = slide.slideId === selectedSlideId;

                    return (
                        <li
                          key={slide.slideId}
                          style={{
                            ...styles.item,
                            background: isSelected ? "#eaeaea" : "transparent",
                          }}
                          onClick={() => onSelect(slide.slideId)}
                        >
                            <strong>Slide {idx + 1}</strong>
                            <div style={styles.meta}>
                                Order: {slide.order}
                            </div>
                        </li>  
                    );
                })}
            </ul>
         )}
    </div>
    );
}

const styles = {
    wrapper: {
        border: "1px solid #ddd",
        padding: "12px",
        borderRadius: "8px",
        background: "#fff",
        minWidth: "240px",
    },
    list: {
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    meta: {
        fontSize: "12px",
        opacity: 0.7,
        marginTop: "4px",
    },
};