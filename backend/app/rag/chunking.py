from langchain_text_splitters import RecursiveCharacterTextSplitter

def detect_structure(text):
    if "•" in text or "-" in text:
        return "bullet"
    elif "Section" in text or "Chapter" in text:
        return "section"
    else:
        return "plain"

def chunk_documents(documents):
    all_chunks = []

    # ⚡ Larger chunks = fewer embeddings = faster
    day_splitter = RecursiveCharacterTextSplitter(
        chunk_size=2500,
        chunk_overlap=200,
        separators=["Day-"]
    )

    for doc in documents:
        day_chunks = day_splitter.split_documents([doc])

        for day_chunk in day_chunks:
            text = day_chunk.page_content
            structure = detect_structure(text)

            # ⚡ Increase chunk sizes to reduce number of splits
            if structure == "bullet":
                splitter = RecursiveCharacterTextSplitter(
                    chunk_size=1200,
                    chunk_overlap=150,
                    separators=["\n\n", "\n", "•", "-"]
                )
            elif structure == "section":
                splitter = RecursiveCharacterTextSplitter(
                    chunk_size=1500,
                    chunk_overlap=200
                )
            else:
                splitter = RecursiveCharacterTextSplitter(
                    chunk_size=1200,
                    chunk_overlap=150
                )

            chunks = splitter.split_documents([day_chunk])

            for i, chunk in enumerate(chunks):
                chunk.metadata["chunk_id"] = i
                if "Day-" in text:
                    day_label = text.split(":")[0].strip()
                    chunk.metadata["day"] = day_label

            all_chunks.extend(chunks)

    return all_chunks
